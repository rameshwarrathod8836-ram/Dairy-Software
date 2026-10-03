import React, { useState } from "react";

const API_BASE = "https://dairy-software-vhh4.onrender.com/api";

export default function Login({ onLogin, onLoginSuccess }) {
 const [username, setUsername] = useState("");
 const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "चुकीचे युझरनेम किंवा पासवर्ड!");
      } else {
        localStorage.setItem("dairy_user", JSON.stringify(data.user));
        
        if (onLogin) {
          onLogin(data.user);
        } else if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      setError("सर्व्हरशी संपर्क होऊ शकला नाही! बॅकएंड (node server.js) चालू आहे का तपासा.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        {/* Header with Icon */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={iconBadge}>🥛</div>
          <h2 style={{ margin: "10px 0 4px", color: "#0f172a", fontSize: "22px", fontWeight: "800" }}>
            डेअरी मॅनेजमेंट सिस्टीम
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: "500" }}>
            Smart Milk Collection Cloud Platform
          </p>
        </div>

        {error && (
          <div style={errorStyle}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>युझरनेम (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="उदा. jagdamb किंवा admin"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>पासवर्ड (Password)</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="पासवर्ड टाका"
                required
                style={{ ...inputStyle, paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={eyeBtn}
              >
                {showPass ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={loading ? btnLoadingStyle : btnStyle}>
            {loading ? "तपासत आहे..." : "🔐 लॉगिन करा"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "#94a3b8" }}>
          सुरक्षित व वेगवान डेअरी व्यवस्थापन
        </div>

      </div>
    </div>
  );
}

// =================== Modern Tailwind-Style UI CSS ===================
const containerStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f5f9",
  fontFamily: "system-ui, -apple-system, sans-serif",
  margin: 0,
  padding: "20px",
  boxSizing: "border-box",
  zIndex: 9999,
};

const cardStyle = {
  background: "#ffffff",
  padding: "36px 32px",
  borderRadius: "16px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
  border: "1px solid #e2e8f0",
  width: "100%",
  maxWidth: "400px",
  boxSizing: "border-box",
};

const iconBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "60px",
  height: "60px",
  borderRadius: "14px",
  background: "#eff6ff",
  fontSize: "30px",
  boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.1)",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "700",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "8px",
  border: "1.5px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  boxSizing: "border-box",
  fontSize: "14px",
  fontWeight: "500",
  outline: "none",
};

const eyeBtn = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  padding: 0,
  color: "#64748b",
};

const btnStyle = {
  width: "100%",
  padding: "12px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "700",
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
};

const btnLoadingStyle = {
  ...btnStyle,
  background: "#93c5fd",
  cursor: "not-allowed",
  boxShadow: "none",
};

const errorStyle = {
  background: "#fee2e2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "10px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "16px",
  textAlign: "center",
};