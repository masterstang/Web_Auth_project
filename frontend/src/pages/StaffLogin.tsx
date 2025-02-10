import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import "./login.css";
import LoadingButton from '@mui/lab/LoadingButton';
import DOMPurify from 'dompurify';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentSSID, setCurrentSSID] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://192.168.1.67";

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const macFromUrl = queryParams.get("id");
  
    if (macFromUrl) {
      localStorage.setItem("macAddress", macFromUrl);
    }
  
    console.log("📡 MAC Address from URL or storage:", macFromUrl || localStorage.getItem("macAddress"));
  
    // ✅ ดึงค่า SSID และบันทึกลง state และ localStorage
    fetch(`${apiBaseUrl}/api/get-current-ssid?mac=${macFromUrl}`)
      .then(response => response.json())
      .then(data => {
        if (data.ssid) {
          console.log("📶 Detected SSID:", data.ssid);
          setCurrentSSID(data.ssid);  // ✅ อัปเดตค่า SSID ใน state
          localStorage.setItem("ssid", data.ssid);  // ✅ บันทึกลง localStorage
        }
      })
      .catch(error => {
        console.error("❌ Error fetching SSID:", error);
      });
  }, []);
  
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      const macAddress = localStorage.getItem("macAddress");
      const ssid = currentSSID || localStorage.getItem("ssid");  // ✅ ใช้ค่าจาก localStorage ถ้า state ว่าง
  
      if (!macAddress) {
        throw new Error("MAC Address is missing. Please reconnect to Wi-Fi.");
      }
  
      console.log("🔍 Checking SSID before login:", ssid);
  
      if (!ssid) {
        throw new Error("SSID is missing. Please reconnect to Wi-Fi.");
      }
  
      // ✅ ตรวจสอบ SSID
      let loginEndpoint;
      if (ssid.startsWith("Test_Co_Ltd_Type_Guest")) {
        loginEndpoint = "/api/login-guest";
      } else if (ssid.startsWith("Test_Co_Ltd_Type_Staff")) {
        loginEndpoint = "/api/login-staff";
      } else {
        throw new Error("Unauthorized SSID. Please connect to the correct Wi-Fi network.");
      }
  
      const response = await axios.post(`${apiBaseUrl}${loginEndpoint}`, {
        username: DOMPurify.sanitize(username),
        password,
        ssid,
        mac: macAddress,
      });
  
      localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("username", DOMPurify.sanitize(username));
  
      console.log(`✅ Authorizing ${username} (${macAddress}) on UniFi`);
  
      await axios.post(`${apiBaseUrl}/api/unifi-authorize`, {
        mac: macAddress,
        username: username,
        ssid: ssid,
      });
  
      window.location.href = response.data.redirect;
    } catch (err: any) {
      console.error("❌ Error during login:", err);
      setError(err.response?.data || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
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

            {error && <p className="login-error">{typeof error === "string" ? error : JSON.stringify(error)}</p>}
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;