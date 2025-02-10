import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LoginGuest from "./pages/Login";  // ✅ หน้า Login ของ Guest
import LoginStaff from "./pages/StaffLogin";  // ✅ หน้า Login ของ Staff
import StatusPage from "./pages/Status";
import Register from "./pages/Register";
import axios from "axios";
import RedirectHandler from "./RedirectHandler";

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* ✅ Route สำหรับ Guest */}
        <Route path="/guest/s/default/login" element={<LoginGuest />} />
        <Route path="/guest/s/default/status" element={<StatusPage />} />
        <Route path="/guest/s/default/register" element={<Register />} />
        <Route path="/guest/s/default/register/:id" element={<Register />} />


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
