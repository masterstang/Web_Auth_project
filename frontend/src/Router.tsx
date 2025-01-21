import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";
import StatusPage from "./pages/Status";
import Register from "./pages/Register";
const AppRouter: React.FC = () => {
  return (
    <Router basename="/guest/s/default/">
      <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/status" element={<StatusPage />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
