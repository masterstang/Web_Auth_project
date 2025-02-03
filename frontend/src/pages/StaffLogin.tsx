import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";
import LoadingButton from '@mui/lab/LoadingButton';
import DOMPurify from 'dompurify';

const LoginStaff: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentSSID, setCurrentSSID] = useState(""); // ✅ เพิ่มตัวแปรเพื่อเก็บ SSID
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
      let loginEndpoint = currentSSID === "Test_Co_Ltd_Type_Guest" ? "/api/login-guest" : "/api/login-staff";
  
      const response = await axios.post(`${apiBaseUrl}${loginEndpoint}`, {
        username: DOMPurify.sanitize(username),
        password,
      });
  
      localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("username", DOMPurify.sanitize(username));
  
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
  
  return (
    <div className="login-container">
      <h1>Staff Login</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <LoadingButton type="submit" loading={loading} variant="contained">
          Login
        </LoadingButton>
      </form>
    </div>
  );
};

export default LoginStaff;
