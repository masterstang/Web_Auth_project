import React, { useEffect, useState } from "react";
import axios from "axios";
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
        </div>
      </div>
    </div>
  );
};

export default StatusPage;