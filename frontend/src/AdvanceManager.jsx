import React, { useState, useEffect } from "react";

const API_BASE = "https://dairy-software-vhh4.onrender.com/api";

export default function AdvanceManager({ dairyId = 1 }) {
  const [farmers, setFarmers] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    farmer_code: "",
    farmer_name: "",
    amount: "",
    reason: "उचल (Cash Advance)",
    advance_date: new Date().toISOString().split("T")[0],
  });

  const loadData = () => {
    fetch(`${API_BASE}/farmers?dairy_id=${dairyId}`)
      .then((res) => res.json())
      .then((data) => setFarmers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Farmers fetch error:", err));

    fetch(`${API_BASE}/advances?dairy_id=${dairyId}`)
      .then((res) => res.json())
      .then((data) => setAdvances(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Advances fetch error:", err));
  };

  useEffect(() => {
    loadData();
  }, [dairyId]);

  // शेतकरी कोड टाकल्यावर नाव आणि सध्याची प्रलंबित उचल आणणे
  const handleFarmerChange = async (code) => {
    const trimmedCode = code.trim();
    const matched = farmers.find(
      (f) => String(f.farmer_code).trim() === trimmedCode
    );

    setForm((prev) => ({
      ...prev,
      farmer_code: code,
      farmer_name: matched ? matched.full_name : "",
    }));

    if (trimmedCode) {
      try {
        const res = await fetch(
          `${API_BASE}/advances/pending?dairy_id=${dairyId}&farmer_code=${trimmedCode}`
        );
        const data = await res.json();
        setPendingBalance(parseFloat(data.total_advance || 0));
      } catch (err) {
        setPendingBalance(0);
      }
    } else {
      setPendingBalance(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.farmer_name) {
      alert("कृपया वैध शेतकरी कोड टाका!");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert("कृपया योग्य रक्कम टाका!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/advances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dairy_id: dairyId }),
      });
      if (res.ok) {
        alert("उचल नोंद यशस्वीरीत्या सेव्ह झाली!");
        const savedCode = form.farmer_code;
        setForm({
          farmer_code: "",
          farmer_name: "",
          amount: "",
          reason: "उचल (Cash Advance)",
          advance_date: new Date().toISOString().split("T")[0],
        });
        setPendingBalance(0);
        loadData();
      } else {
        alert("नोंद सेव्ह करताना त्रुटी आली!");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (str) => {
    if (!str) return "-";
    const dateOnly = String(str).split("T")[0].split(" ")[0];
    const p = dateOnly.split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : dateOnly;
  };

  // डॅशबोर्ड कार्ड्ससाठी आकडेमोड
  const totalAdvanceGiven = advances.reduce(
    (acc, curr) => acc + parseFloat(curr.amount || 0),
    0
  );
  const totalPending = advances
    .filter((a) => a.status === "PENDING")
    .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const totalDeducted = advances
    .filter((a) => a.status === "DEDUCTED")
    .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  // सर्च व स्टेटस फिल्टर
  const filteredAdvances = advances.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      String(item.farmer_code).toLowerCase().includes(q) ||
      String(item.farmer_name || "").toLowerCase().includes(q) ||
      String(item.reason || "").toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL" ? true : item.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div
      style={{
        maxWidth: "1150px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* १. सारांश कार्ड्स (KPI Cards) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ ...kpiCard, borderTop: "4px solid #2563eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>एकूण दिलेली उचल / खर्च</div>
              <div style={{ ...kpiValue, color: "#1e3a8a" }}>
                ₹ {totalAdvanceGiven.toFixed(2)}
              </div>
            </div>
            <span style={kpiIcon}>💰</span>
          </div>
          <div style={kpiFooter}>सर्व नोंदवलेली उचल व खर्च</div>
        </div>

        <div style={{ ...kpiCard, borderTop: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>शिल्लक / येणे बाकी (Pending)</div>
              <div style={{ ...kpiValue, color: "#b45309" }}>
                ₹ {totalPending.toFixed(2)}
              </div>
            </div>
            <span style={kpiIcon}>⏳</span>
          </div>
          <div style={kpiFooter}>पुढील बिलात कपात होणे बाकी</div>
        </div>

        <div style={{ ...kpiCard, borderTop: "4px solid #16a34a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>एकूण कपात झालेली रक्कम</div>
              <div style={{ ...kpiValue, color: "#15803d" }}>
                ₹ {totalDeducted.toFixed(2)}
              </div>
            </div>
            <span style={kpiIcon}>✅</span>
          </div>
          <div style={kpiFooter}>१० दिवसांच्या बिलातून वजा झालेली</div>
        </div>
      </div>

      {/* २. उचल व खर्च नोंद फॉर्म कार्ड */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          padding: "22px 24px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 18px -2px rgba(15, 23, 42, 0.05)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "17.5px", fontWeight: "800" }}>
            💰 शेतकरी उचल / पशूखाद्य खर्च नोंद
          </h3>
          {form.farmer_code && form.farmer_name && (
            <div
              style={{
                background: pendingBalance > 0 ? "#fef3c7" : "#f0fdf4",
                border: `1px solid ${pendingBalance > 0 ? "#fde68a" : "#bbf7d0"}`,
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "700",
                color: pendingBalance > 0 ? "#b45309" : "#15803d",
              }}
            >
              चालू शिल्लक उचल: ₹ {pendingBalance.toFixed(2)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr 1.3fr 1.3fr 1fr auto",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={labelStyle}>तारीख</label>
            <input
              type="date"
              value={form.advance_date}
              onChange={(e) =>
                setForm({ ...form, advance_date: e.target.value })
              }
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>शेतकरी कोड *</label>
            <input
              type="text"
              placeholder="उदा. 101"
              value={form.farmer_code}
              onChange={(e) => handleFarmerChange(e.target.value)}
              style={{ ...inputStyle, border: "2px solid #2563eb", background: "#f8fafc" }}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>शेतकऱ्याचे नाव</label>
            <input
              type="text"
              readOnly
              value={form.farmer_name || "नाव आपोआप येईल"}
              style={{
                ...inputStyle,
                background: "#f1f5f9",
                fontWeight: "700",
                color: form.farmer_name ? "#0f172a" : "#94a3b8",
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>तपशील (कारण / प्रकार)</label>
            <select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              style={selectStyle}
            >
              <option value="उचल (Cash Advance)">उचल (Cash Advance)</option>
              <option value="सरकी पेंड">सरकी पेंड</option>
              <option value="पशूखाद्य / भुसा">पशूखाद्य / भुसा</option>
              <option value="औषधे / मिनरल मिक्सर">औषधे / मिनरल मिक्सर</option>
              <option value="इतर कपात">इतर कपात</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>रक्कम (₹) *</label>
            <input
              type="number"
              step="1"
              placeholder="उदा. 500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <button type="submit" disabled={loading} style={btnSave}>
              {loading ? "..." : "➕ नोंदवा"}
            </button>
          </div>
        </div>
      </form>

      {/* ३. उचल नोंदींची यादी व फिल्टर कार्ड */}
      <div
        style={{
          background: "#ffffff",
          padding: "22px 24px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 18px -2px rgba(15, 23, 42, 0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h4 style={{ margin: 0, color: "#0f172a", fontSize: "16.5px", fontWeight: "800" }}>
              📋 नोंदवलेली उचल व कपात यादी (एकूण: {filteredAdvances.length})
            </h4>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12px" }}>
              शेतकऱ्यांना दिलेली उचल व बिलातील कपातीचा हिशोब
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                style={statusFilter === "ALL" ? filterBtnActive : filterBtnInactive}
              >
                सर्व
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                style={statusFilter === "PENDING" ? filterBtnActive : filterBtnInactive}
              >
                ⏳ शिल्लक
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DEDUCTED")}
                style={statusFilter === "DEDUCTED" ? filterBtnActive : filterBtnInactive}
              >
                ✅ कपात
              </button>
            </div>

            <input
              type="text"
              placeholder="🔍 कोड, नाव किंवा कारणाने शोधा..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  textAlign: "left",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                <th style={th}>दिनांक</th>
                <th style={th}>कोड</th>
                <th style={th}>शेतकऱ्याचे नाव</th>
                <th style={th}>तपशील (कारण)</th>
                <th style={th}>रक्कम (₹)</th>
                <th style={th}>स्थिती (Status)</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={td}>{formatDate(item.advance_date)}</td>
                  <td style={td}>
                    <span style={codeBadge}>{item.farmer_code}</span>
                  </td>
                  <td style={{ ...td, fontWeight: "700", color: "#0f172a" }}>
                    {item.farmer_name}
                  </td>
                  <td style={td}>
                    <span style={reasonBadge}>{item.reason}</span>
                  </td>
                  <td style={{ ...td, fontWeight: "800", color: "#dc2626" }}>
                    - ₹ {parseFloat(item.amount).toFixed(2)}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "4px 9px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "inline-block",
                        background:
                          item.status === "PENDING" ? "#fef3c7" : "#dcfce7",
                        color:
                          item.status === "PENDING" ? "#b45309" : "#15803d",
                        border: `1px solid ${
                          item.status === "PENDING" ? "#fde68a" : "#bbf7d0"
                        }`,
                      }}
                    >
                      {item.status === "PENDING"
                        ? "⏳ शिल्लक (Pending)"
                        : "✅ कपात झाली (Deducted)"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAdvances.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}
                  >
                    कोणतीही नोंद सापडली नाही.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ======================== Modern Dashboard Styles ========================
const kpiCard = {
  background: "#ffffff",
  padding: "16px 18px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 15px -2px rgba(15, 23, 42, 0.04)",
  boxSizing: "border-box",
};

const kpiLabel = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#64748b",
};

const kpiValue = {
  fontSize: "22px",
  fontWeight: "900",
  marginTop: "4px",
  letterSpacing: "-0.5px",
};

const kpiIcon = {
  fontSize: "24px",
  background: "#f8fafc",
  padding: "8px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const kpiFooter = {
  fontSize: "11.5px",
  color: "#64748b",
  marginTop: "8px",
  paddingTop: "6px",
  borderTop: "1px dashed #e2e8f0",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12.5px",
  fontWeight: "700",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1.5px solid #cbd5e1",
  fontSize: "13.5px",
  color: "#0f172a",
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const searchInputStyle = {
  width: "220px",
  padding: "7px 12px",
  borderRadius: "8px",
  border: "1.5px solid #cbd5e1",
  fontSize: "12.5px",
  outline: "none",
  background: "#f8fafc",
  boxSizing: "border-box",
};

const btnSave = {
  padding: "10px 18px",
  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
};

const filterBtnActive = {
  padding: "6px 12px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  fontWeight: "700",
  fontSize: "12px",
  cursor: "pointer",
};

const filterBtnInactive = {
  padding: "6px 12px",
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "12px",
  cursor: "pointer",
};

const th = {
  padding: "12px 14px",
  fontWeight: "700",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const td = {
  padding: "12px 14px",
  verticalAlign: "middle",
};

const codeBadge = {
  background: "#f1f5f9",
  padding: "3px 8px",
  borderRadius: "6px",
  fontWeight: "800",
  color: "#1e3a8a",
};

const reasonBadge = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  padding: "3px 8px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#334155",
};