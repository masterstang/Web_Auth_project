import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";
import LoadingButton from '@mui/lab/LoadingButton';
import DOMPurify from 'dompurify';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentSSID, setCurrentSSID] = useState(""); // ✅ เพิ่มตัวแปรเพื่อเก็บ SSID
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://192.168.1.67";

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const macFromUrl = queryParams.get("id");
  
    if (macFromUrl) {
      localStorage.setItem("macAddress", macFromUrl); // ✅ บันทึกลง LocalStorage
    }
  
    console.log("MAC Address from URL or storage:", macFromUrl || localStorage.getItem("macAddress"));
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
<<<<<<< HEAD
      let loginEndpoint = currentSSID === "Test_Co_Ltd_Type_Guest" ? "/api/login-guest" : "/api/login-staff";
  
      const response = await axios.post(`${apiBaseUrl}${loginEndpoint}`, {
        username: DOMPurify.sanitize(username),
=======
      console.log("Logging in user:", username);
      

      const response = await axios.post(`${apiBaseUrl}/api/login`, {
        username: DOMPurify.sanitize(username), // ✅ ป้องกัน XSS
>>>>>>> 75c5f28 (DOMPurify)
        password,
      });
  
      localStorage.setItem("token", response.data.accessToken);
<<<<<<< HEAD
      localStorage.setItem("username", DOMPurify.sanitize(username));
  
=======
      localStorage.setItem("username", DOMPurify.sanitize(username)); // ✅ ป้องกัน XSS

      // ดึง MAC Address จาก localStorage ถ้าไม่มีใน URL
>>>>>>> 75c5f28 (DOMPurify)
      const macAddress = localStorage.getItem("macAddress");
      if (!macAddress) {
        throw new Error("MAC Address is missing. Please reconnect to Wi-Fi.");
      }
  
      console.log(`Authorizing ${username} (${macAddress}) on UniFi`);
  
      await axios.post(`${apiBaseUrl}/api/unifi-authorize`, {
        mac: macAddress,
        username: username,
        ssid: currentSSID,
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