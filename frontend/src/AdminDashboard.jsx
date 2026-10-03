import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000/api";

export default function AdminDashboard({ onLogout }) {
  const [dairies, setDairies] = useState([]);
  const [stats, setStats] = useState({
    total_dairies: 0,
    active_dairies: 0,
    total_farmers: 0,
    today_liters: 0,
    today_amount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [editingDairy, setEditingDairy] = useState(null);

  // नवीन डेअरी फॉर्म स्टेट
  const [form, setForm] = useState({
    dairy_code: "",
    dairy_name: "",
    owner_name: "",
    phone: "",
    address: "",
    username: "",
    password: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dairiesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dairies`),
        fetch(`${API_BASE}/admin/stats`),
      ]);
      const dairiesData = await dairiesRes.json();
      const statsData = await statsRes.json();

      setDairies(Array.isArray(dairiesData) ? dairiesData : []);
      if (!statsData.error) {
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // १. नवीन डेअरी नोंदवणे
  const handleCreateDairy = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/create-dairy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ नवीन डेअरी आणि लॉगिन यशस्वीरीत्या तयार झाले!");
        setForm({
          dairy_code: "",
          dairy_name: "",
          owner_name: "",
          phone: "",
          address: "",
          username: "",
          password: "",
        });
        loadData();
      } else {
        alert(data.error || "डेअरी नोंदवताना त्रुटी आली!");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    }
  };

  // २. डेअरी माहिती दुरुस्त करणे
  const handleUpdateDairy = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/dairies/${editingDairy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDairy),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ डेअरी प्रोफाईल माहिती अपडेट झाली!");
        setEditingDairy(null);
        loadData();
      } else {
        alert(data.error || "अपडेट करताना त्रुटी आली!");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    }
  };

  // ३. ब्लॉक / ॲक्टिव्ह टॉगल करणे
  const handleToggleStatus = async (dairyId, currentStatus) => {
    const nextStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const msg =
      nextStatus === "BLOCKED"
        ? "खात्री आहे का? या डेअरीचे लॉगिन तात्काळ बंद (Block) होईल!"
        : "या डेअरीचे खाते पुन्हा सुरू करायचे आहे का?";

    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dairy_id: dairyId, status: nextStatus }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert("स्टेटस बदलताना त्रुटी आली!");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1329", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {/* १. टॉप हेडर */}
      <header style={{ background: "#111c44", padding: "16px 28px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🛡️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#38bdf8" }}>सुपर ॲडमिन कंट्रोल पॅनल</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>SaaS डेअरी मॅनेजमेंट मास्टर सिस्टीम</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
        >
          🚪 बाहेर पडा (Logout)
        </button>
      </header>

      <main style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 16px" }}>
        {/* २. SaaS Analytics Overview Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={statCard}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>एकूण डेअरी केंद्रे</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>
              {stats.total_dairies} <span style={{ fontSize: "13px", color: "#34d399", fontWeight: "600" }}>({stats.active_dairies} सुरू)</span>
            </div>
          </div>

          <div style={statCard}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>एकूण जोडलेले शेतकरी</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#a78bfa", marginTop: "4px" }}>
              {stats.total_farmers}
            </div>
          </div>

          <div style={statCard}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>आजचे एकूण दूध संकलन</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#facc15", marginTop: "4px" }}>
              {Number(stats.today_liters).toFixed(1)} <span style={{ fontSize: "14px", fontWeight: "600" }}>Ltr</span>
            </div>
          </div>

          <div style={statCard}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>आजची एकूण दूध उलाढाल</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#4ade80", marginTop: "4px" }}>
              ₹ {Number(stats.today_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* ३. नवीन डेअरी नोंदणी फॉर्म */}
        <div style={{ background: "#111c44", padding: "22px", borderRadius: "12px", border: "1px solid #1e293b", marginBottom: "26px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#f1f5f9" }}>➕ नवीन डेअरी जोडा व खाते तयार करा</h3>
          <form onSubmit={handleCreateDairy} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <input
              type="text"
              placeholder="डेअरी कोड (उदा. DAIRY02) *"
              value={form.dairy_code}
              onChange={(e) => setForm({ ...form, dairy_code: e.target.value })}
              style={darkInput}
              required
            />
            <input
              type="text"
              placeholder="डेअरीचे नाव *"
              value={form.dairy_name}
              onChange={(e) => setForm({ ...form, dairy_name: e.target.value })}
              style={darkInput}
              required
            />
            <input
              type="text"
              placeholder="चालकाचे नाव *"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
              style={darkInput}
              required
            />
            <input
              type="text"
              placeholder="मोबाईल नंबर"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={darkInput}
            />
            <input
              type="text"
              placeholder="पत्ता / गाव"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={darkInput}
            />
            <input
              type="text"
              placeholder="लॉगिन युझरनेम *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              style={darkInput}
              required
            />
            <input
              type="password"
              placeholder="लॉगिन पासवर्ड *"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={darkInput}
              required
            />
            <button
              type="submit"
              style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", padding: "10px" }}
            >
              🚀 डेअरी तयार करा
            </button>
          </form>
        </div>

        {/* ४. नोंदणीकृत डेअरींची यादी */}
        <div style={{ background: "#111c44", padding: "22px", borderRadius: "12px", border: "1px solid #1e293b" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#f1f5f9" }}>
            🏢 नोंदणीकृत डेअरी यादी ({dairies.length})
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#0b1329", textAlign: "left", color: "#94a3b8" }}>
                  <th style={thStyle}>कोड</th>
                  <th style={thStyle}>डेअरीचे नाव</th>
                  <th style={thStyle}>चालक / मालक</th>
                  <th style={thStyle}>मोबाईल</th>
                  <th style={thStyle}>पत्ता</th>
                  <th style={thStyle}>शेतकरी</th>
                  <th style={thStyle}>लॉगिन</th>
                  <th style={thStyle}>स्थिती</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>कृती</th>
                </tr>
              </thead>
              <tbody>
                {dairies.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={tdStyle}><span style={{ color: "#38bdf8", fontWeight: "700" }}>{d.dairy_code}</span></td>
                    <td style={{ ...tdStyle, fontWeight: "700" }}>{d.dairy_name}</td>
                    <td style={tdStyle}>{d.owner_name}</td>
                    <td style={tdStyle}>{d.phone || "-"}</td>
                    <td style={tdStyle}>{d.address || "-"}</td>
                    <td style={tdStyle}>{d.total_farmers || 0} शेतकरी</td>
                    <td style={tdStyle}><code style={{ background: "#0b1329", padding: "2px 6px", borderRadius: "4px" }}>{d.username || "-"}</code></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        background: d.status === "ACTIVE" ? "#065f46" : "#7f1d1d",
                        color: d.status === "ACTIVE" ? "#34d399" : "#fca5a5"
                      }}>
                        {d.status === "ACTIVE" ? "सुरू (Active)" : "बंद (Blocked)"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => setEditingDairy(d)}
                        style={{ padding: "5px 10px", marginRight: "6px", background: "#334155", color: "#f8fafc", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                      >
                        ✏️ दुरुस्त
                      </button>
                      <button
                        onClick={() => handleToggleStatus(d.id, d.status)}
                        style={{
                          padding: "5px 10px",
                          background: d.status === "ACTIVE" ? "#dc2626" : "#16a34a",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "700"
                        }}
                      >
                        {d.status === "ACTIVE" ? "🚫 ब्लॉक करा" : "✅ सुरू करा"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ५. माहिती दुरुस्ती मोडल (Edit Modal) */}
        {editingDairy && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div style={{ background: "#111c44", padding: "24px", borderRadius: "12px", width: "420px", border: "1px solid #334155" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#38bdf8", fontSize: "16px" }}>✏️ डेअरी माहिती दुरुस्त करा (सुपर ॲडमिन)</h3>
              <form onSubmit={handleUpdateDairy} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8" }}>डेअरीचे नाव</label>
                  <input
                    type="text"
                    value={editingDairy.dairy_name}
                    onChange={(e) => setEditingDairy({ ...editingDairy, dairy_name: e.target.value })}
                    style={darkInput}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8" }}>चालकाचे नाव</label>
                  <input
                    type="text"
                    value={editingDairy.owner_name}
                    onChange={(e) => setEditingDairy({ ...editingDairy, owner_name: e.target.value })}
                    style={darkInput}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8" }}>मोबाईल नंबर</label>
                  <input
                    type="text"
                    value={editingDairy.phone || ""}
                    onChange={(e) => setEditingDairy({ ...editingDairy, phone: e.target.value })}
                    style={darkInput}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#94a3b8" }}>पत्ता</label>
                  <input
                    type="text"
                    value={editingDairy.address || ""}
                    onChange={(e) => setEditingDairy({ ...editingDairy, address: e.target.value })}
                    style={darkInput}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setEditingDairy(null)}
                    style={{ padding: "8px 14px", background: "#334155", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                  >
                    रद्द करा
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "8px 16px", background: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700" }}
                  >
                    💾 सेव्ह करा
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const statCard = {
  background: "#111c44",
  padding: "18px 20px",
  borderRadius: "12px",
  border: "1px solid #1e293b",
};

const darkInput = {
  width: "100%",
  padding: "9px 12px",
  background: "#0b1329",
  border: "1px solid #1e293b",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "13px",
  boxSizing: "border-box",
  outline: "none",
};

const thStyle = {
  padding: "12px",
  fontSize: "12px",
  textTransform: "uppercase",
};

const tdStyle = {
  padding: "12px",
  verticalAlign: "middle",
};