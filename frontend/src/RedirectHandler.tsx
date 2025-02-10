import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://192.168.1.67";
console.log("API Base URL:", API_BASE_URL);

const RedirectHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🔄 RedirectHandler Mounted. Checking URL Parameters...");
    const queryParams = new URLSearchParams(window.location.search);
    const macFromUrl = queryParams.get("id");
    const ssidFromUrl = queryParams.get("ssid");

    console.log("🌐 Current URL:", window.location.href);
    console.log("📡 MAC Address in URL:", macFromUrl);
    console.log("📶 SSID in URL:", ssidFromUrl);

    if (macFromUrl) {
      localStorage.setItem("macAddress", macFromUrl);
      console.log("✅ MAC Address Stored:", macFromUrl);
    } else {
      console.warn("⚠️ No MAC Address in URL.");
    }

    if (ssidFromUrl) {
      localStorage.setItem("ssid", ssidFromUrl);
      console.log("✅ SSID Stored:", ssidFromUrl);
    } else {
      console.warn("⚠️ No SSID in URL.");
    }

    const storedMac = localStorage.getItem("macAddress");
    const storedSSID = localStorage.getItem("ssid");
    console.log("📶 SSID from URL:", storedSSID);

    console.log("📌 Stored MAC Address:", storedMac);
    console.log("📌 Stored SSID:", storedSSID);

    if (!storedSSID) {
      console.warn("⚠️ SSID is missing, staying on the page.");
      return;
    }

    console.log("🔄 Checking SSID for Redirect:", storedSSID);

    if (storedSSID.startsWith("Test_Co_Ltd_Type_Guest")) {
      console.log("🔀 Redirecting to Guest Login...");
      window.location.href = `/guest/s/default/login?id=${storedMac}`;
    } else if (storedSSID.startsWith("Test_Co_Ltd_Type_Staff")) {
      console.log("🔀 Redirecting to Staff Login...");
      window.location.href = `/staff/s/default/login?id=${storedMac}`;
    } else {
      console.warn("❓ Unknown SSID, staying on the page.");
    }
  }, [navigate]);

  return <div>Redirecting...</div>;
};

export default RedirectHandler;
