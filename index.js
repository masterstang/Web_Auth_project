import dotenv from "dotenv";
dotenv.config();
import https from 'https';
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import axios from "axios";
import mysql from "mysql";
import bcrypt from "bcrypt";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";


const app = express();
const port = process.env.PORT || 5000;

// Keycloak settings
const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID;
const keycloakSecret = process.env.KEYCLOAK_CLIENT_SECRET;
const keycloakRealm = process.env.KEYCLOAK_REALM;
const keycloakBaseUrl = process.env.KEYCLOAK_URL;

console.log("Keycloak Client ID:", keycloakClientId);

// Connect to Daloradius
const daloradiusDb = mysql.createConnection({
  host: process.env.DALORADIUS_DB_HOST,
  user: process.env.DALORADIUS_DB_USER,
  password: process.env.DALORADIUS_DB_PASSWORD,
  database: process.env.DALORADIUS_DB_NAME,
});

daloradiusDb.connect((err) => {
  if (err) {
    console.error("Error connecting to Daloradius DB:", err);
  } else {
    console.log("Connected to Daloradius database!");
  }
});

// Middleware
app.use(cors({
  origin: '*',  // หรือกำหนดเป็นเฉพาะโดเมน
  methods: ['GET', 'POST'],}));
app.use(bodyParser.json());
app.use(helmet());
//Header CSP (Content Security Policy)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';"
  );
  next();
});


// Middleware Limit login

// Verify Token Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  axios
    .post(
      `${keycloakBaseUrl}/realms/${keycloakRealm}/protocol/openid-connect/token/introspect`,
      new URLSearchParams({
        client_id: keycloakClientId,
        client_secret: keycloakSecret,
        token: token,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    )
    .then((response) => {
      if (response.data.active) {
        req.user = response.data;
        next();
      } else {
        res.status(401).send({ error: "Invalid Token" });
      }
    })
    .catch((err) => {
      console.error("Token validation error:", err.message);
      res.status(500).send("Internal Server Error");
    });
};
const forceRadiusSync = (username) => {
  return new Promise((resolve, reject) => {
    daloradiusDb.query(`CALL update_radius_cache(?)`, [username], (err) => {
      if (err) {
        console.error("Error calling stored procedure:", err);
        reject(err);
      } else {
        console.log("RADIUS cache updated successfully for user:", username);
        resolve();
      }
    });
  });
};
//----------Dompurify-----------------------------------------------
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
// 🛡 ใช้ express-validator กรองข้อมูลที่รับจากผู้ใช้
const validateUserInput = [
  body("username").trim().escape(),
  body("email").trim().isEmail().normalizeEmail(),
  body("password").trim(),
  body("firstName").trim().escape(),
  body("lastName").trim().escape(),
  body("mobilePhone").trim().escape(),
];

//-------------------------------
// API LOGIN
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and Password are required.");
  }

  try {
    console.log("Fetching user password from Daloradius...");

    // 🔹 ค้นหารหัสผ่านที่ถูก Hash ในฐานข้อมูล `radcheck`
    const query = `SELECT value FROM radcheck WHERE username = ? AND attribute = 'Cleartext-Password'`;

    // 👉 ใช้ Promise แทน Callback เพื่อให้รองรับ `await`
    const results = await new Promise((resolve, reject) => {
      daloradiusDb.query(query, [username], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (results.length === 0) {
      return res.status(401).send("Invalid username or password.");
    }

    const hashedPassword = results[0].value; //  ได้รหัสผ่านที่ถูก Hash จากฐานข้อมูล

    // 🔹 ตรวจสอบรหัสผ่านที่ผู้ใช้ป้อนกับที่ถูก Hash ใน DB
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (!passwordMatch) {
      return res.status(401).send("Invalid username or password.");
    }

    console.log("Password verified. Authenticating user in Keycloak...");

    // 🔹 ทำการตรวจสอบกับ Keycloak
    const params = new URLSearchParams();
    params.append("client_id", process.env.KEYCLOAK_CLIENT_ID);
    params.append("client_secret", process.env.KEYCLOAK_CLIENT_SECRET);
    params.append("username", username);
    params.append("password", password);
    params.append("grant_type", "password");

    const keycloakResponse = await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = keycloakResponse.data.access_token;
    console.log("Access Token received from Keycloak:", accessToken);

    await forceRadiusSync(username);
    console.log("RADIUS data synchronized successfully.");

    console.log("Fetching user status from daloRADIUS...");

    // 🔹 Query ดึงข้อมูลจาก daloRADIUS
    const userStatusQuery = `
      SELECT 
        radacct.username,
        radacct.AcctSessionTime AS session_time,
        radacct.AcctInputOctets + radacct.AcctOutputOctets AS data_usage,
        radacct.AcctStartTime AS last_login
      FROM radacct
      WHERE radacct.username = ?
      ORDER BY radacct.AcctStartTime DESC
      LIMIT 1;
    `;

    const userStatusResults = await new Promise((resolve, reject) => {
      daloradiusDb.query(userStatusQuery, [username], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const userStatus = userStatusResults.length > 0 ? userStatusResults[0] : null;
    console.log("User status fetched successfully:", userStatus);

    //  ส่งข้อมูลกลับไปยัง Client
    res.status(200).json({
      accessToken,
      status: userStatus,
      redirect: "http://192.168.1.67/guest/s/default/status",
    });

  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).send(
      error.response?.data?.error_description || "Internal Server Error."
    );
  }
});

///----------------------------------------------

app.post("/api/register", validateUserInput, async (req, res) => {
  console.log("Request Body:", req.body);

  // ตรวจสอบความถูกต้องของข้อมูล
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid input data", details: errors.array() });
  }

  // 🔹 ป้องกัน XSS ด้วย DOMPurify
  const cleanData = {
    username: DOMPurify.sanitize(req.body.username),
    email: DOMPurify.sanitize(req.body.email),
    password: req.body.password, // รหัสผ่านไม่ต้อง Escape
    firstName: DOMPurify.sanitize(req.body.firstName),
    lastName: DOMPurify.sanitize(req.body.lastName),
    mobilePhone: DOMPurify.sanitize(req.body.mobilePhone),
    idpassport: DOMPurify.sanitize(req.body.idpassport),
  };

  try {
    console.log("Cleaned Data:", cleanData);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(cleanData.password, saltRounds);
    console.log("Hashed Password:", hashedPassword);

    console.log("Step 1: Requesting Keycloak admin token...");

    const tokenResponse = await axios.post(
      `${keycloakBaseUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: keycloakClientId,
        client_secret: keycloakSecret,
        grant_type: "client_credentials",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const adminToken = tokenResponse.data.access_token;
    console.log("Step 2: Admin Token Received");

    console.log("Step 3: Creating user in Keycloak...");
    await axios.post(
      `${keycloakBaseUrl}/admin/realms/${keycloakRealm}/users`,
      {
        username: cleanData.username,
        email: cleanData.email,
        enabled: true,
        firstName: cleanData.firstName,
        lastName: cleanData.lastName,
        credentials: [
          {
            type: "password",
            value: cleanData.password,
            temporary: false,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Step 4: User created successfully in Keycloak");

    // Step 5: Add user to Daloradius
    console.log("Step 5: Registering user in Daloradius...");

    // เพิ่มข้อมูลในตาราง radcheck
    const radcheckQuery = `INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Cleartext-Password', ':=', ?), (?, 'Email', ':=', ?), (?, 'Mobile', ':=', ?), (?, 'IDPassport', ':=', ?);`;

    await new Promise((resolve, reject) => {
      daloradiusDb.query(
        radcheckQuery,
        [cleanData.username, hashedPassword, cleanData.username, cleanData.email, cleanData.username, cleanData.mobilePhone, cleanData.username, cleanData.idpassport],
        (err) => {
          if (err) {
            console.error("Error inserting user into radcheck:", err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    console.log("Step 6: User credentials and additional details added to radcheck.");

    // เพิ่มข้อมูลในตาราง userinfo
    const userInfoQuery = `INSERT INTO userinfo (username, firstname, lastname, email, mobilephone, idpassport) VALUES (?, ?, ?, ?, ?, ?)`;

    await new Promise((resolve, reject) => {
      daloradiusDb.query(
        userInfoQuery,
        [cleanData.username, cleanData.firstName, cleanData.lastName, cleanData.email, cleanData.mobilePhone, cleanData.idpassport],
        (err) => {
          if (err) {
            console.error("Error inserting user info:", err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    console.log("Step 7: User info added to userinfo table.");

    // เพิ่มข้อมูลในตาราง radusergroup เพื่อกำหนดกลุ่มผู้ใช้
    const groupQuery = `INSERT INTO radusergroup (username, groupname, priority) VALUES (?, 'GuestUser', 3)`;

    await new Promise((resolve, reject) => {
      daloradiusDb.query(groupQuery, [cleanData.username], (err) => {
        if (err) {
          console.error("Error inserting into radusergroup:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("Step 8: User added to radusergroup.");
    console.log("Registration process completed successfully.");
    res.status(201).send("User registered successfully.");

  } catch (error) {
    console.error("Keycloak Registration Error:", error.response?.data || error.message);
    res.status(500).send("Error registering user.");
  }
});

//----------------------Api/status-------------------------------------------------------------
app.get("/api/status/:username", verifyToken, async (req, res) => {
  const { username } = req.params;

  try {
    console.log("Fetching user status for:", username);

    // Query ดึงข้อมูลผู้ใช้จาก Daloradius
    const userQuery = `
      SELECT 
        userinfo.firstname,
        userinfo.lastname,
        userinfo.email,
        userinfo.mobilephone,
        radusergroup.groupname
      FROM userinfo
      LEFT JOIN radusergroup ON userinfo.username = radusergroup.username
      WHERE userinfo.username = ?
    `;

    // Query ดึง Bandwidth จาก radgroupreply
    const bandwidthQuery = `
      SELECT 
        radgroupreply.attribute,
        radgroupreply.value
      FROM radusergroup
      JOIN radgroupreply 
      ON radusergroup.groupname = radgroupreply.groupname
      WHERE radusergroup.username = ?
    `;

    // ดึงข้อมูลผู้ใช้
    const userInfo = await new Promise((resolve, reject) => {
      daloradiusDb.query(userQuery, [username], (err, results) => {
        if (err) {
          console.error("Database error (user):", err);
          return reject(err);
        }
        if (results.length === 0) {
          return reject(new Error("User not found"));
        }
        resolve(results[0]);
      });
    });

    // ดึงข้อมูล Bandwidth
    const bandwidthInfo = await new Promise((resolve, reject) => {
      daloradiusDb.query(bandwidthQuery, [username], (err, results) => {
        if (err) {
          console.error("Database error (bandwidth):", err);
          return reject(err);
        }
        const bandwidth = {
          download: 0,
          upload: 0,
        };
        results.forEach((row) => {
          if (row.attribute === 'WISPr-Bandwidth-Max-Down') {
            bandwidth.download = parseInt(row.value, 10) / 1024; // Convert to Mbps
          } else if (row.attribute === 'WISPr-Bandwidth-Max-Up') {
            bandwidth.upload = parseInt(row.value, 10) / 1024; // Convert to Mbps
          }
        });
        resolve(bandwidth);
      });
    });

    // รวมข้อมูล User และ Bandwidth
    const response = {
      firstname: userInfo.firstname,
      lastname: userInfo.lastname,
      email: userInfo.email,
      mobilephone: userInfo.mobilephone,
      groupname: userInfo.groupname,
      bandwidth: {
        download: `${bandwidthInfo.download} Mbps`,
        upload: `${bandwidthInfo.upload} Mbps`,
      },
    };

    // ส่งข้อมูลกลับไปยัง Client
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching user status:", error.message);
    if (error.message === "User not found") {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(500).send("Internal Server Error");
  }
});

//--------------
app.post("/api/unifi-authorize", async (req, res) => {
  try {
    console.log("Received Request Body:", req.body);

    if (!req.body || !req.body.mac || !req.body.username) {
      console.error("MAC Address or Username is missing in request body");
      return res.status(400).json({ error: "MAC Address and Username are required" });
    }

    const macAddress = req.body.mac.trim();
    const username = req.body.username.trim();

    console.log(`Received MAC: ${macAddress}, Username: ${username}`);

    // 🔹 ดึง Role (Group) จาก daloRADIUS
    daloradiusDb.query(
      "SELECT groupname FROM radusergroup WHERE username = ?",
      [username],
      async (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: "Database error while fetching user group" });
        }

        if (results.length === 0) {
          console.error("User group not found in daloRADIUS");
          return res.status(403).json({ error: "User group not assigned" });
        }

        const userGroup = results[0].groupname;
        console.log(`User ${username} belongs to group: ${userGroup}`);

        // ✅ กำหนดค่า SSID ตาม Group
        let allowedSSID = null;
        if (userGroup === "GuestUser") {
          allowedSSID = "Test_Co_Ltd_Type_Guest";
        } else if (userGroup === "Staff") {
          allowedSSID = "Test_Co_Ltd_Type_Staff";
        } else {
          console.error("User group not authorized for any SSID");
          return res.status(403).json({ error: "User group not authorized for any SSID" });
        }

        console.log(`User ${username} should be connected to: ${allowedSSID}`);

        // 🔹 ตรวจสอบว่า MAC Address นี้กำลังเชื่อมต่อกับ SSID ที่ถูกต้อง
        let client;
        try {
          const unifiResponse = await axios.get(
            "https://192.168.1.1/proxy/network/api/s/default/stat/sta",
            {
              headers: {
                "X-API-KEY": process.env.UNIFI_API_KEY,
                "Accept": "application/json",
              },
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            }
          );

          const clients = unifiResponse.data.data;
          console.log("Full UniFi Response:", JSON.stringify(unifiResponse.data, null, 2)); // ✅ Log ทั้งหมดเพื่อ Debug

          client = clients.find(
            (c) => c.mac.toLowerCase() === macAddress.toLowerCase() && c.is_wired === false
          );
        } catch (error) {
          console.error("Failed to fetch connected clients from UniFi:", error.message);
          return res.status(500).json({ error: "Failed to fetch connected clients from UniFi." });
        }

        if (!client) {
          console.error(`MAC Address ${macAddress} not found in UniFi Controller`);
          console.error("List of all detected clients:", JSON.stringify(clients, null, 2));
          return res.status(403).json({ error: "MAC Address not connected to any SSID" });
        }

        if (!client.ap_mac) { 
          console.error(`MAC Address ${macAddress} is not a wireless client.`);
          return res.status(403).json({ error: "Device is not connected via Wi-Fi" });
        }

        console.log(`MAC Address ${macAddress} is connected to SSID: ${client.essid}`);

        if (client.essid !== allowedSSID) {
          console.error(`User ${username} is connected to ${client.essid} but allowed on ${allowedSSID}`);
          return res.status(403).json({ error: `Unauthorized SSID access: ${client.essid}` });
        }
        
        // ✅ ส่งคำสั่ง authorize-guest ไปยัง UniFi Controller เพื่อให้ MAC ใช้อินเทอร์เน็ตได้
        try {
          const authorizeResponse = await axios.post(
            "https://192.168.1.1/proxy/network/api/s/default/cmd/stamgr",
            {
              cmd: "authorize-guest",
              mac: macAddress,
              minutes: 1, // ✅ อนุญาตให้ใช้งานอินเทอร์เน็ต 1 นาที
            },
            {
              headers: {
                "X-API-KEY": process.env.UNIFI_API_KEY,
                "Accept": "application/json",
              },
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            }
          );
        
          console.log(`User ${username} authorized for internet access:`, authorizeResponse.data);
        } catch (error) {
          console.error("UniFi authorization failed:", error.message);
          return res.status(500).json({ error: "Failed to authorize with UniFi." });
        }
        
        res.status(200).json({ message: `User ${username} authorized for ${allowedSSID}` });
        
      }
    );
    
  } catch (error) {
    console.error("Unhandled error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




//--------------------------------------------------------------------------------------
// Root Endpoint
app.get('/guest/s/default/', (req, res) => {
  res.redirect('/');
});
app.get("/", (req, res) => {
  res.send("Server is running! Use /api/login for Keycloak authentication.");
});


// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server is running on http://192.168.1.67:${port}`);
});