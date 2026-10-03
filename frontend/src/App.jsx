import React, { useState } from "react";
import MilkCollection from "./MilkCollection";
import FarmerRegistration from "./FarmerRegistration";
import BillingReport from "./BillingReport";
import AdvanceManager from "./AdvanceManager";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import RateSettings from "./RateSettings";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("dairy_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState("collection");
  const [backingUp, setBackingUp] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("dairy_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("dairy_user");
  };

  const handleDownloadBackup = async () => {
    setBackingUp(true);
    try {
      const dairyId = user?.dairy_id || 1;
      const response = await fetch(
        `http://localhost:5000/api/backup?dairy_id=${dairyId}`
      );
      if (!response.ok) throw new Error("Backup download fail zala!");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `Dairy_Backup_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert("Excel backup download zala!");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} onLoginSuccess={handleLogin} />;
  }

  // सुपर ॲडमिन चेक (रोल किंवा युझरनेम)
  if (
    user.role === "SUPER_ADMIN" ||
    user.role === "admin" ||
    user.username?.toLowerCase() === "admin"
  ) {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div style={fullScreenRoot}>
      <style>{`
        * {
          box-sizing: border-box;
        }
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-height: 100vh !important;
          background-color: #f8fafc !important;
          overflow-x: hidden !important;
          display: block !important;
        }
      `}</style>

      {/* १. Top Enterprise Navbar */}
      <header className="no-print" style={topHeaderNav}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={brandBadge}>🥛</div>
          <div>
            <div style={brandTitle}>
              {user.dairy_name || "जगदंब दूध संकलन केंद्र"}
            </div>
            <div style={brandSub}>
              लॉगिन: <span style={{ color: "#38bdf8", fontWeight: "700" }}>{user.username}</span> (डेअरी चालक)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={handleDownloadBackup} disabled={backingUp} style={btnBackupModern}>
            <span>📊</span>
            <span>{backingUp ? "बॅकअप..." : "Excel बॅकअप"}</span>
          </button>
          <button onClick={handleLogout} style={btnLogoutModern}>
            <span>🚪</span>
            <span>बाहेर पडणे</span>
          </button>
        </div>
      </header>

      {/* २. Segmented Capsule Bar */}
      <div className="no-print" style={tabBarContainer}>
        <div style={tabBarShell}>
          {[
            { id: "collection", label: "दूध संकलन", icon: "🥛" },
            { id: "farmers", label: "शेतकरी नोंदणी", icon: "👨‍🌾" },
            { id: "billing", label: "१० दिवसांचे बिल", icon: "📄" },
            { id: "advance", label: "उचल / खर्च", icon: "💰" },
            { id: "rates", label: "दरपत्रक", icon: "⚙️" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...tabBtnItem,
                  background: isActive ? "#ffffff" : "transparent",
                  color: isActive ? "#1d4ed8" : "#64748b",
                  fontWeight: isActive ? "800" : "600",
                  boxShadow: isActive ? "0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)" : "none",
                }}
              >
                <span style={{ fontSize: "15px" }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ३. Main Content Area */}
      <main style={mainContentShell}>
        {activeTab === "collection" && (
          <MilkCollection dairyId={user.dairy_id || 1} dairyInfo={user} />
        )}
        {activeTab === "farmers" && (
          <FarmerRegistration dairyId={user.dairy_id || 1} />
        )}
        {activeTab === "billing" && (
          <BillingReport dairyId={user.dairy_id || 1} dairyInfo={user} />
        )}
        {activeTab === "advance" && (
          <AdvanceManager dairyId={user.dairy_id || 1} />
        )}
        {activeTab === "rates" && (
          <RateSettings dairyId={user.dairy_id || 1} />
        )}
      </main>
    </div>
  );
}

// ======================== Modern Dashboard Styles ========================
const fullScreenRoot = {
  width: "100%",
  minHeight: "100vh",
  background: "#f8fafc",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
};

const topHeaderNav = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#ffffff",
  padding: "10px 32px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.25)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  width: "100%",
  boxSizing: "border-box",
};

const brandBadge = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  background: "rgba(255, 255, 255, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.15)",
};

const brandTitle = {
  margin: 0,
  fontSize: "16.5px",
  fontWeight: "800",
  letterSpacing: "0.2px",
  color: "#ffffff",
};

const brandSub = {
  margin: "1px 0 0",
  fontSize: "11.5px",
  color: "#94a3b8",
};

const btnBackupModern = {
  padding: "7px 14px",
  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  fontWeight: "700",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
};

const btnLogoutModern = {
  padding: "7px 14px",
  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  fontWeight: "700",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.25)",
};

const tabBarContainer = {
  maxWidth: "1150px",
  margin: "16px auto 12px",
  padding: "0 16px",
  boxSizing: "border-box",
};

const tabBarShell = {
  display: "flex",
  background: "#e2e8f0",
  padding: "4px",
  borderRadius: "12px",
  boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.06)",
  gap: "4px",
};

const tabBtnItem = {
  flex: 1,
  padding: "8px 12px",
  border: "none",
  borderRadius: "9px",
  cursor: "pointer",
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

const mainContentShell = {
  maxWidth: "1150px",
  margin: "0 auto",
  padding: "0 16px 36px",
  boxSizing: "border-box",
};