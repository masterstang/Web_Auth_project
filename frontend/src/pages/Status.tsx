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

  if (error) {
    return <p className="status-error">{error}</p>;
  }

  return (
    <div className="status-container">
      <h1 className="status-header">User Status</h1>
      {userStatus ? (
        <div className="status-info">
          <p>
            <strong>First Name:</strong> {userStatus.firstname}
          </p>
          <p>
            <strong>Last Name:</strong> {userStatus.lastname}
          </p>
          <p>
            <strong>Email:</strong> {userStatus.email}
          </p>
          <p>
            <strong>Mobile Phone:</strong> {userStatus.mobilephone}
          </p>
          <p>
            <strong>Group Name:</strong> {userStatus.groupname}
          </p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default StatusPage;
