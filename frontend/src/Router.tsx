import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LoginGuest from "./pages/Login";  // ✅ หน้า Login ของ Guest
import LoginStaff from "./pages/StaffLogin";  // ✅ หน้า Login ของ Staff
import StatusPage from "./pages/Status";
import Register from "./pages/Register";
import axios from "axios";

const RedirectHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSSID = async () => {
      try {
        const response = await axios.get("http://192.168.1.67/api/get-current-ssid");
        const ssid = response.data.ssid;

        console.log("Detected SSID:", ssid);

        if (ssid === "Test_Co_Ltd_Type_Guest") {
          navigate("/guest/s/default/login"); // ✅ Redirect ไปหน้า Login ของ Guest
        } else if (ssid === "Test_Co_Ltd_Type_Staff") {
          navigate("/staff/s/default/login"); // ✅ Redirect ไปหน้า Login ของ Staff
        } else {
          navigate("/guest/s/default/login"); // ✅ Default ไป Guest ถ้าไม่มี SSID ที่ถูกต้อง
        }
      } catch (error) {
        console.error("Error fetching SSID:", error);
        navigate("/guest/s/default/login"); // ✅ ถ้าเกิด Error Default ไป Guest
      }
    };

    checkSSID();
  }, [navigate]);

  return <div>Redirecting...</div>; // ✅ แสดงข้อความขณะกำลัง Redirect
};

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* ✅ Route สำหรับ Guest */}
        <Route path="/guest/s/default/login" element={<LoginGuest />} />
        <Route path="/guest/s/default/status" element={<StatusPage />} />
        <Route path="/guest/s/default/register" element={<Register />} />

        {/* ✅ Route สำหรับ Staff */}
        <Route path="/staff/s/default/login" element={<LoginStaff />} />
        <Route path="/staff/s/default/status" element={<StatusPage />} />

        {/* ✅ แก้ปัญหา "No routes matched location" โดยให้ Redirect ไปหน้าที่ถูกต้อง */}
        <Route path="/" element={<RedirectHandler />} />
        <Route path="/guest/s/default/" element={<RedirectHandler />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
