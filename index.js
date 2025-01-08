require("dotenv").config(); // โหลดค่าจาก .env

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql");
const app = express();
const port = process.env.PORT || 5000; // อ่าน PORT จาก .env หรือใช้ค่า 5000 เป็นค่าเริ่มต้น

// อ่านค่าการตั้งค่าจากไฟล์ .env
const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID;
const keycloakSecret = process.env.KEYCLOAK_CLIENT_SECRET;
const keycloakRealm = process.env.KEYCLOAK_REALM;
const keycloakBaseUrl = process.env.KEYCLOAK_URL; // ใช้ BASE URL

console.log("Keycloak Client ID:", keycloakClientId);

//---------Connet Daloradius-------------------------
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

//---------------------------------
// Middleware
app.use(cors());
app.use(bodyParser.json());
// Middleware ตรวจสอบ Token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) 
    {

    return res.status(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  // ตรวจสอบว่า Token ถูกต้องหรือไม่ (ใช้ Keycloak หรือ JWT Validation)
  axios
    .post(
      `${keycloakBaseUrl}/realms/${keycloakRealm}/protocol/openid-connect/token/introspect`,
      new URLSearchParams({
        client_id: keycloakClientId,
        client_secret: keycloakSecret,
        token: token,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    .then((response) => {
      if (response.data.active) {
        req.user = response.data; // เก็บข้อมูลใน req.user
        next();
      } else {
        res.status(401).send({ error: "Invalid Token" });
      }
    })
    .catch((err) => {
      console.error("Token validation error:", err.message);
      res.status(500).send("Internal Server Error");
    });
}
// API LOGIN
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and Password are required.");
  }

  try {
    // Step 1: Authenticate with Keycloak
    console.log("Authenticating user in Keycloak...");

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
    //--เก็บ Token --------
    const accessToken = keycloakResponse.data.access_token;
    console.log("Access Token received from Keycloak:", accessToken);

    // Step 2: Fetch user status from daloRADIUS
    console.log("Fetching user status from daloRADIUS...");
    const query = `
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

    daloradiusDb.query(query, [username], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Error fetching user status from daloRADIUS.");
      }

      if (results.length > 0) {
        console.log("User status fetched successfully:", results[0]);
        res.status(200).json({
          accessToken,
          status: results[0],
        });
      } else {
        console.log("No user status found in daloRADIUS.");
        res.status(200).json({
          accessToken,
          status: null, // ไม่มีข้อมูลการใช้งานใน daloRADIUS
        });
      }
    });
  } catch (error) {
    console.error("Keycloak login error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).send(
      error.response?.data?.error_description || "Invalid username or password."
    );
  }
});

// API Register
app.post("/api/register", async (req, res) => {
  console.log("Request Body:", req.body);

  const { username, email, password, firstName, lastName, mobilePhone } = req.body;

  if (!username || !password || !firstName || !lastName || !mobilePhone) {
    return res.status(400).send("Username, Password, First Name, Last Name, and Mobile Phone are required.");
  }

  try {
    // Step 1: Register in Keycloak
    console.log("Registering user in Keycloak...");
    const tokenResponse = await axios.post(
      `${keycloakBaseUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: keycloakClientId,
        client_secret: keycloakSecret,
        grant_type: "client_credentials",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const adminToken = tokenResponse.data.access_token;
    console.log("Admin Token Received:", adminToken);

    // สร้างผู้ใช้ใน Keycloak
    const keycloakResponse = await axios.post(
      `${keycloakBaseUrl}/admin/realms/${keycloakRealm}/users`,
      {
        username,
        email,
        enabled: true,
        firstName,
        lastName,
        credentials: [
          {
            type: "password",
            value: password,
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

    console.log("User created successfully in Keycloak:", keycloakResponse.data);

    // Step 2: Use Token to Authenticate in Daloradius
    console.log("Registering user in Daloradius...");
    const query = `
      INSERT INTO radcheck (username, attribute, op, value)
      VALUES (?, 'Cleartext-Password', ':=', ?)
    `;

    daloradiusDb.query(query, [username, password], (err, results) => {
      if (err) {
        console.error("Error inserting user into Daloradius DB:", err);
        return res.status(500).send("Error registering user in Daloradius.");
      }

      console.log("User created successfully in radcheck.");
      //? เป็น Placeholder ป้องกันการทำ SQL Injection
      const userInfoQuery = `
        INSERT INTO userinfo (username, firstname, lastname, email, mobilephone)
        VALUES (?, ?, ?, ?, ?)
      `;

      daloradiusDb.query(userInfoQuery, [username, firstName, lastName, email, mobilePhone], (err, userInfoResults) => {
        if (err) {
          console.error("Error inserting user into userinfo table:", err);
          return res.status(500).send("Error registering user in Daloradius.");
        }

        console.log("User info added successfully to userinfo table.");

        // Add to radusergroup
        const groupQuery = `
          INSERT INTO radusergroup (username, groupname, priority)
          VALUES (?, 'guest', 1)
        `;

        daloradiusDb.query(groupQuery, [username], (err, groupResults) => {
          if (err) {
            console.error("Error inserting user into radusergroup:", err);
            return res.status(500).send("Error registering user in radusergroup.");
          }

          console.log("User added successfully to radusergroup.");
          res.status(201).send("User registered successfully in both Keycloak and Daloradius.");
        });
      });
    });
  } catch (error) {
    console.error("Keycloak Error:", error.response?.data || error.message);
    res.status(500).send("Error registering user");
  }
});
//----------------------Api/status-------------------------------------------------------------
app.get("/api/status/:username", verifyToken, async (req, res) => {
  const { username } = req.params;

  try {
    console.log("Fetching user status for:", username);

    // Query ดึงข้อมูลจาก Daloradius
    const query = `
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

    daloradiusDb.query(query, [username], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Internal Server Error");
      }

      if (results.length === 0) {
        return res.status(404).send({ error: "User not found" });
      }

      // ส่งข้อมูลกลับไปยัง Client
      res.status(200).json(results[0]);
    });
  } catch (error) {
    console.error("Error fetching user status:", error.message);
    res.status(500).send("Internal Server Error");
  }
});


//--------------------------------------------------------------------------------------
// Root Endpoint
app.get("/", (req, res) => {
  res.send("Server is running! Use /api/login for Keycloak authentication.");
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
