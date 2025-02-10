import React, { useEffect, useState, } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./status.css";
import DOMPurify from 'dompurify';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://192.168.1.67";
console.log("API Base URL:", apiBaseUrl);

interface Bandwidth {
  download: number; // In Kbps from API
  upload: number;   // In Kbps from API
}

interface UserStatus {
  firstname: string;
  lastname: string;
  email: string;
  mobilephone: string;
  groupname: string;
  bandwidth?: Bandwidth; // Optional field for bandwidth
}


const StatusPage: React.FC = () => {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // ✅ ใช้ navigate สำหรับ Redirect


  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
  
      if (!token || !username) {
        setError("Unauthorized. Please log in.");
        return;
      }
  
      try {
        const response = await axios.get(`${apiBaseUrl}/api/status/${DOMPurify.sanitize(username)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserStatus(response.data);
      } catch (err: any) {
        console.error("Error fetching status:", err.response?.data);
        setError(err.response?.data?.error || "Failed to fetch user status.");
      }
    };
  
    fetchStatus();
  }, []);

  const handleLogout = async () => {
    console.log("🔴 Logging out...");
  
    const token = localStorage.getItem("token");
    const macAddress = localStorage.getItem("macAddress"); // ✅ ดึง MAC Address จาก localStorage
    const ssid = localStorage.getItem("ssid");
  
    if (!macAddress) {
      console.error("❌ No MAC Address found in localStorage");
      return;
    }
  
    let loginRedirect = "/guest/s/default/login"; // ค่าเริ่มต้น
    if (ssid?.startsWith("Test_Co_Ltd_Type_Staff")) {
      loginRedirect = "/staff/s/default/login";
    }
  
    loginRedirect += `?id=${macAddress}`; // ✅ เพิ่ม MAC Address ลงไปใน URL
  
    if (token) {
      try {
        await axios.post(`${apiBaseUrl}/api/logout`, { token, mac: macAddress });
        console.log("✅ Logged out and Internet Disconnected.");
      } catch (error) {
        console.error("❌ Logout API failed, proceeding with local logout.");
      }
    }
  
    // ✅ ลบข้อมูลผู้ใช้ใน localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("macAddress");
    localStorage.removeItem("ssid");
  
    console.log(`🔀 Redirecting to: ${loginRedirect}`);
    navigate(loginRedirect); // ✅ Redirect ไปหน้า Login พร้อม MAC Address
  };
  
  
  return (
    <div className="main-container">
      <div className="status-container">
        <div className="status-card">
          <h1 className="status-header">User Status</h1>
          {error ? (
            <p className="status-error">{error}</p>
          ) : userStatus ? (
            <div className="status-info">
              <div className="status-item">
                <strong>First Name:</strong> <span>{userStatus.firstname}</span>
              </div>
              <div className="status-item">
                <strong>Last Name:</strong> <span>{userStatus.lastname}</span>
              </div>
              <div className="status-item">
                <strong>Email:</strong> <span>{userStatus.email}</span>
              </div>
              <div className="status-item">
                <strong>Mobile Phone:</strong> <span>{userStatus.mobilephone}</span>
              </div>
              <div className="status-item">
                <strong>Group Name:</strong> <span>{userStatus.groupname}</span>
              </div>
            </div>
          ) : (
            <p>Loading...</p>
          )}
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;