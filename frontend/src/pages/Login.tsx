import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";
import LoadingButton from '@mui/lab/LoadingButton';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      const response = await axios.post("http://192.168.1.67/api/login", {
        username,
        password,
      });
  
      localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("username", username);
  
      // Redirect ไปยังหน้าสถานะหลังจาก login สำเร็จ
      navigate("/status");
    } catch (err: any) {
      setError(err.response?.data || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleRegisterRedirect = () => {
    navigate("/register"); // นำทางไปยังหน้า Register
  };

  return (
    <div className="split-container">
      {/* ส่วนด้านซ้าย */}
      <div className="left-section">
        <h1>Welcome</h1>
        <p>This is the left section with content or branding.</p>
      </div>

      {/* ส่วนด้านขวา */}
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

            {error && <p className="login-error">{error}</p>}

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
