import React, { useState, useEffect } from "react";

export default function AdminPanel({ onLogout }) {
  const [dairies, setDairies] = useState([]);
  const [form, setForm] = useState({
    dairy_code: "",
    dairy_name: "",
    owner_name: "",
    phone: "",
    address: "",
    valid_until: "2027-12-31",
    username: "",
    password: "",
  });
  const [msg, setMsg] = useState("");

  const loadDairies = () => {
    fetch("http://localhost:5000/api/admin/dairies")
      .then((res) => res.json())
      .then((data) => setDairies(data || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadDairies();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("तयार करत आहे...");
    try {
      const res = await fetch("http://localhost:5000/api/admin/create-dairy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("✅ डेअरी यशस्वीरीत्या जोडली!");
        setForm({
          dairy_code: "",
          dairy_name: "",
          owner_name: "",
          phone: "",
          address: "",
          valid_until: "2027-12-31",
          username: "",
          password: "",
        });
        loadDairies();
      } else {
        setMsg("❌ " + (data.error || "त्रुटी आली"));
      }
    } catch (err) {
      setMsg("❌ सर्व्हरशी संपर्क होऊ शकला नाही!");
    }
  };

  const toggleStatus = async (dairy_id, currentStatus) => {
    const action = currentStatus ? "ब्लॉक" : "सुरू";
    if (!window.confirm(`तुम्हाला नक्की ही डेअरी ${action} करायची आहे का?`)) return;

    try {
      await fetch("http://localhost:5000/api/admin/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dairy_id, is_active: currentStatus ? 0 : 1 }),
      });
      loadDairies();
    } catch (err) {
      alert("स्टेटस बदलताना एरर आला!");
    }
  };

  const activeCount = dairies.filter((d) => d.is_active).length;

  return (
    <div style={fullScreenWrapper}>
      {/* १. Top Glassmorphic Navigation Header */}
      <header style={topHeaderBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={crownBadge}>👑</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={headerTitleText}>मास्टर ॲडमिन पॅनल</h1>
              <span style={superAdminPill}>SUPER ADMIN</span>
            </div>
            <p style={headerSubtitleText}>डेअरी शाखा व्यवस्थापन व क्लाउड परवाना प्रणाली</p>
          </div>
        </div>

        {onLogout && (
          <button onClick={onLogout} style={btnLogoutStyle}>
            <span>🚪</span>
            <span>बाहेर पडणे (Logout)</span>
          </button>
        )}
      </header>

      {/* २. Main Dashboard Layout */}
      <div style={dashboardContainer}>
        
        {/* Quick KPI Stats Bar */}
        <div style={statsGrid}>
          <div style={statCard}>
            <span style={statIcon}>🏢</span>
            <div>
              <div style={statLabel}>एकूण डेअरी शाखा</div>
              <div style={statValue}>{dairies.length}</div>
            </div>
          </div>
          <div style={statCard}>
            <span style={statIcon}>🟢</span>
            <div>
              <div style={statLabel}>सक्रिय (Active) शाखा</div>
              <div style={{ ...statValue, color: "#16a34a" }}>{activeCount}</div>
            </div>
          </div>
          <div style={statCard}>
            <span style={statIcon}>🔴</span>
            <div>
              <div style={statLabel}>ब्लॉक / बंद शाखा</div>
              <div style={{ ...statValue, color: "#dc2626" }}>{dairies.length - activeCount}</div>
            </div>
          </div>
        </div>

        {msg && (
          <div
            style={{
              padding: "12px 18px",
              background: msg.includes("✅") ? "#ecfdf5" : "#fef2f2",
              color: msg.includes("✅") ? "#065f46" : "#991b1b",
              border: `1px solid ${msg.includes("✅") ? "#a7f3d0" : "#fecaca"}`,
              borderRadius: "10px",
              marginBottom: "20px",
              fontWeight: "600",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{msg.includes("✅") ? "✨" : "⚠️"}</span>
            <span>{msg}</span>
          </div>
        )}

        <div style={mainGrid}>
          
          {/* डावी बाजू: डेअरी नोंदणी फॉर्म */}
          <div style={premiumCard}>
            <div style={cardHeaderRow}>
              <div style={iconBadgeSmall}>➕</div>
              <div>
                <h3 style={cardHeading}>नवीन डेअरी नोंदवा</h3>
                <p style={cardSub}>शाखेची अधिकृत माहिती व क्रेडेंशियल्स द्या</p>
              </div>
            </div>

            <form onSubmit={handleCreate}>
              <div style={twoColRow}>
                <div>
                  <label style={inputLabel}>डेअरी कोड</label>
                  <input
                    style={modernInput}
                    placeholder="उदा. SD02"
                    value={form.dairy_code}
                    onChange={(e) => setForm({ ...form, dairy_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={inputLabel}>मोबाईल नंबर</label>
                  <input
                    style={modernInput}
                    placeholder="१० अंकी नंबर"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={inputLabel}>डेअरीचे नाव</label>
                <input
                  style={modernInput}
                  placeholder="उदा. शिवकृपा दूध संकलन केंद्र"
                  value={form.dairy_name}
                  onChange={(e) => setForm({ ...form, dairy_name: e.target.value })}
                  required
                />
              </div>

              <div style={twoColRow}>
                <div>
                  <label style={inputLabel}>मालकाचे नाव</label>
                  <input
                    style={modernInput}
                    placeholder="मालकाचे पूर्ण नाव"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={inputLabel}>पत्ता / गाव</label>
                  <input
                    style={modernInput}
                    placeholder="गाव / ठिकाण"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={inputLabel}>सबस्क्रिप्शन अंतिम तारीख</label>
                <input
                  type="date"
                  style={modernInput}
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  required
                />
              </div>

              {/* Login Credentials Box */}
              <div style={credentialsBox}>
                <div style={credentialsTitle}>
                  <span>🔐</span> लॉगिन क्रेडेंशियल्स द्या:
                </div>
                <div style={twoColRow}>
                  <div>
                    <label style={credLabel}>युझरनेम</label>
                    <input
                      style={modernInput}
                      placeholder="Username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={credLabel}>पासवर्ड</label>
                    <input
                      style={modernInput}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" style={btnSubmitModern}>
                <span>🚀</span>
                <span>डेअरी तयार करा व परवाना द्या</span>
              </button>
            </form>
          </div>

          {/* उजवी बाजू: डेअरीज तक्ता */}
          <div style={premiumCard}>
            <div style={cardHeaderRow}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={iconBadgeSmall}>📋</div>
                <div>
                  <h3 style={cardHeading}>नोंदणीकृत डेअरीज ({dairies.length})</h3>
                  <p style={cardSub}>क्लाउड नेटवर्कमधील सर्व सक्रिय शाखा</p>
                </div>
              </div>
              <button onClick={loadDairies} style={btnRefreshModern}>
                🔄 रीफ्रेश
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableMain}>
                <thead>
                  <tr style={tableHeaderRow}>
                    <th style={thStyle}>डेअरी शाखा</th>
                    <th style={thStyle}>युझरनेम</th>
                    <th style={thStyle}>मुदत</th>
                    <th style={thStyle}>स्थिती</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>ॲक्शन</th>
                  </tr>
                </thead>
                <tbody>
                  {dairies.map((d) => (
                    <tr key={d.id} style={tableRowStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                          {d.dairy_name}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                          कोड: <span style={codeBadgeStyle}>{d.dairy_code || `#${d.id}`}</span>
                          {d.phone && ` • 📞 ${d.phone}`}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <code style={usernameBadgeStyle}>{d.username}</code>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                          {d.valid_until
                            ? new Date(d.valid_until).toLocaleDateString("en-IN")
                            : "-"}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: d.is_active ? "#dcfce7" : "#fee2e2",
                            color: d.is_active ? "#15803d" : "#b91c1c",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {d.is_active ? "🟢 सुरू" : "🔴 बंद"}
                        </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <button
                          onClick={() => toggleStatus(d.id, d.is_active)}
                          style={{
                            padding: "7px 14px",
                            background: d.is_active ? "#ef4444" : "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "7px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "700",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {d.is_active ? "🚫 ब्लॉक करा" : "✅ सुरू करा"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {dairies.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        कोणतीही डेअरी उपलब्ध नाही.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ======================== Full-Width Ultra-Modern Styles ========================
const fullScreenWrapper = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100vh",
  background: "#f1f5f9",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  overflowY: "auto",
  boxSizing: "border-box",
  zIndex: 1000,
};

const topHeaderBar = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#ffffff",
  padding: "16px 36px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.25)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
};

const crownBadge = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "rgba(255, 255, 255, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.15)",
};

const headerTitleText = {
  margin: 0,
  fontSize: "19px",
  fontWeight: "800",
  letterSpacing: "-0.2px",
};

const superAdminPill = {
  background: "#f59e0b",
  color: "#000",
  fontSize: "10px",
  fontWeight: "800",
  padding: "2px 7px",
  borderRadius: "4px",
  letterSpacing: "0.5px",
};

const headerSubtitleText = {
  margin: "3px 0 0",
  fontSize: "12.5px",
  color: "#94a3b8",
};

const btnLogoutStyle = {
  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  color: "#ffffff",
  border: "none",
  padding: "9px 18px",
  borderRadius: "8px",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
};

const dashboardContainer = {
  maxWidth: "1400px",
  margin: "0 auto",
  padding: "24px 28px 40px",
  boxSizing: "border-box",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "18px",
  marginBottom: "24px",
};

const statCard = {
  background: "#ffffff",
  padding: "16px 20px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const statIcon = {
  fontSize: "26px",
  background: "#f8fafc",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const statLabel = {
  fontSize: "12.5px",
  color: "#64748b",
  fontWeight: "600",
};

const statValue = {
  fontSize: "22px",
  fontWeight: "800",
  color: "#0f172a",
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "440px 1fr",
  gap: "24px",
  alignItems: "flex-start",
};

const premiumCard = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px -4px rgba(15, 23, 42, 0.05)",
};

const cardHeaderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "20px",
};

const iconBadgeSmall = {
  width: "38px",
  height: "38px",
  borderRadius: "10px",
  background: "#eff6ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "17px",
  color: "#2563eb",
};

const cardHeading = {
  margin: 0,
  fontSize: "17px",
  fontWeight: "800",
  color: "#0f172a",
};

const cardSub = {
  margin: "3px 0 0",
  fontSize: "12.5px",
  color: "#64748b",
};

const twoColRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "14px",
};

const inputLabel = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12.5px",
  fontWeight: "700",
  color: "#334155",
};

const credLabel = {
  display: "block",
  marginBottom: "4px",
  fontSize: "11.5px",
  fontWeight: "600",
  color: "#475569",
};

const modernInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1.5px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "13.5px",
  fontWeight: "500",
  boxSizing: "border-box",
  outline: "none",
  transition: "all 0.15s ease",
};

const credentialsBox = {
  background: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)",
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid #bae6fd",
  marginBottom: "20px",
};

const credentialsTitle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#0369a1",
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const btnSubmitModern = {
  width: "100%",
  padding: "13px",
  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "9px",
  fontWeight: "800",
  fontSize: "14.5px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxShadow: "0 6px 14px -2px rgba(22, 163, 74, 0.3)",
};

const btnRefreshModern = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  padding: "7px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12.5px",
  fontWeight: "700",
  color: "#334155",
};

const tableMain = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const tableHeaderRow = {
  background: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
};

const thStyle = {
  padding: "12px 14px",
  textAlign: "left",
  fontWeight: "700",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tableRowStyle = {
  borderBottom: "1px solid #f1f5f9",
};

const tdStyle = {
  padding: "14px",
  verticalAlign: "middle",
};

const codeBadgeStyle = {
  background: "#f1f5f9",
  padding: "2px 6px",
  borderRadius: "4px",
  fontWeight: "700",
  color: "#1e3a8a",
};

const usernameBadgeStyle = {
  background: "#0f172a",
  color: "#f8fafc",
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "600",
};