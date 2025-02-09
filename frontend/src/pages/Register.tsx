import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./register.css";
import DOMPurify from 'dompurify';


const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    mobilePhone: "",
    idpassport:"",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: DOMPurify.sanitize(value) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
  
    try {
      await axios.post("http://192.168.1.67/api/register", formData);
      setSuccess("Registration successful! Redirecting to login...");
  
      // เก็บ MAC Address ไว้ก่อน redirect
      const macAddress = localStorage.getItem("macAddress");
  
      setTimeout(() => {
        navigate(`/?id=${macAddress}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data || "Error registering user");
    }
  };
  
  return (
    <div className="split-container">
      {/* Left Section */}
      <div className="left-section">
        <div className="overlay"></div>
        <h1>Welcome</h1>
        <p>Join us today! Fill out the form to register.</p>
      </div>

      {/* Right Section */}
      <div className="right-section">
        <div className="register-container">
          <h2>Register</h2>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="column">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="mobilePhone">Mobile Phone</label>
                <input
                  type="text"
                  name="mobilePhone"
                  placeholder="Mobile Phone"
                  value={formData.mobilePhone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="column">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />

                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="center-row">
              <label htmlFor="idPassport" className="id-passport-label">ID PassPort</label>
              <input
                type="text"
                name="idpassport"
                placeholder="ID"
                value={formData.idpassport}
                onChange={handleChange}
                className="id-passport-input"
                required
              />
            </div>

            <div className="center-row">
              <button type="submit" className="register-button">
                Register
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;