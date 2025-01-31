import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";
import LoadingButton from '@mui/lab/LoadingButton';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentSSID, setCurrentSSID] = useState(""); // ✅ เพิ่มตัวแปรเพื่อเก็บ SSID
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://192.168.1.67";
  console.log("API Base URL:", apiBaseUrl);

  useEffect(() => {
    // ดึงค่า MAC Address จาก URL หรือ LocalStorage
    const queryParams = new URLSearchParams(window.location.search);
    const macFromUrl = queryParams.get("id");

    if (macFromUrl) {
      localStorage.setItem("macAddress", macFromUrl); // บันทึกลง localStorage
    }

    console.log("MAC Address from URL or storage:", macFromUrl || localStorage.getItem("macAddress"));
  }, []);
  
  useEffect(() => {
    const fetchSSID = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/api/get-current-ssid`);
        if (response.data && response.data.ssid) {
          setCurrentSSID(response.data.ssid);
          console.log("Fetched SSID:", response.data.ssid);
        } else {
          console.error("SSID not found in API response.");
        }
      } catch (error) {
        console.error("Error fetching SSID:", error);
      }
    };
  
    fetchSSID();
  }, []);
  

  console.log("Current SSID before sending request:", currentSSID);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Logging in user:", username);
      

      const response = await axios.post(`${apiBaseUrl}/api/login`, {
        username,
        password,
      });

      localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("username", username);

      // ดึง MAC Address จาก localStorage ถ้าไม่มีใน URL
      const macAddress = localStorage.getItem("macAddress");
      if (!macAddress) {
        throw new Error("MAC Address is missing. Please reconnect to Wi-Fi.");
      }

      console.log(`Authorizing ${username} (${macAddress}) on UniFi`);
      console.log("Username:", username);
      console.log("Current SSID before sending request:", currentSSID);

      // 🔹 ส่ง MAC Address + Username ไปตรวจสอบที่ API
      await axios.post(`${apiBaseUrl}/api/unifi-authorize`, {
        mac: macAddress,
        username: username, // ส่ง username ไปให้ API ตรวจสอบ Role
        ssid: currentSSID, // ต้องส่งค่า SSID ไปให้ API ตรวจสอบ
      });
      

      window.location.href = response.data.redirect;
    } catch (err: any) {
      console.error("Error during login:", err);
      setError(err.response?.data || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    navigate(`/register?${window.location.search}`);  // ส่งพารามิเตอร์ URL ไปยังหน้าสมัครสมาชิก
  };

  return (
    <div className="split-container">
      <div className="left-section">
        <h1>Welcome</h1>
        <p>This is the left section with content or branding.</p>
      </div>

      <div className="right-section">
        <div className="login-container">
          <h1 className="login-header">Login</h1>
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <LoadingButton
              type="submit"
              loading={loading}
              variant="contained"
              className="login-button"
            >
              Login
            </LoadingButton>

            {error && <p className="login-error">{typeof error === 'string' ? error : JSON.stringify(error)}</p>}

            <p>Don't have an account?</p>
            <button
              type="button"
              className="register-button"
              onClick={handleRegisterRedirect}
            >
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;