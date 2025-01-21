import React, { useEffect, useState } from "react";
import axios from "axios";
import "./status.css";

interface UserStatus {
  firstname: string;
  lastname: string;
  email: string;
  mobilephone: string;
  groupname: string;
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
        const response = await axios.get(
          `http://localhost:5000/api/status/${username}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUserStatus(response.data);
      } catch (err: any) {
        setError(err.response?.data || "Failed to fetch user status.");
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
