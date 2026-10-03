import React, { useState, useEffect, useCallback } from "react";

const API_BASE = "https://dairy-software-vhh4.onrender.com/api";

export default function FarmerRegistration({ dairyId = 1 }) {
  const currentDairyId = Number(dairyId) || 1;

  const [farmers, setFarmers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    farmer_code: "",
    full_name: "",
    milk_type: "COW",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const loadFarmers = useCallback(() => {
    fetch(`${API_BASE}/farmers?dairy_id=${currentDairyId}`)
      .then((res) => res.json())
      .then((data) => setFarmers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Farmers load error:", err));
  }, [currentDairyId]);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  // १. नोंदणी दिनांक फॉरमॅट (DD-MM-YYYY)
  const formatDate = (dateVal) => {
    if (!dateVal) return "-";
    const dateOnly = String(dateVal).split("T")[0].split(" ")[0];
    const p = dateOnly.split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : dateOnly;
  };

  // २. अपडेट तारीख आणि वेळ फॉरमॅट
  const formatDateTime = (val) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const datePart = d.toLocaleDateString("en-GB").replace(/\//g, "-");
      const timePart = d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${datePart} ${timePart}`;
    } catch (e) {
      return String(val);
    }
  };

  const handleEdit = (farmer) => {
    setEditingId(farmer.id);
    setForm({
      farmer_code: farmer.farmer_code,
      full_name: farmer.full_name,
      milk_type: farmer.milk_type || "COW",
      phone: farmer.phone || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      farmer_code: "",
      full_name: "",
      milk_type: "COW",
      phone: "",
    });
  };

  // नवीन नोंदणी किंवा एडिट अपडेट
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.farmer_code || !form.full_name) {
      alert("कृपया कोड आणि नाव दोन्ही भरा!");
      return;
    }

    setLoading(true);
    try {
      const url = editingId ? `${API_BASE}/farmers/${editingId}` : `${API_BASE}/farmers`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dairy_id: currentDairyId }),
      });

      if (res.ok) {
        alert(editingId ? "शेतकरी माहिती यशस्वीरीत्या अपडेट झाली!" : "शेतकरी यशस्वीरीत्या नोंदवला गेला!");
        cancelEdit();
        loadFarmers();
      } else {
        const data = await res.json();
        alert(data.error || "प्रक्रियेत त्रुटी आली!");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      String(f.farmer_code).toLowerCase().includes(q) ||
      String(f.full_name || "").toLowerCase().includes(q) ||
      String(f.phone || "").includes(q)
    );
  });

  return (
    <div style={{ maxWidth: "1150px", margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* १. शेतकरी नोंदणी व संपादन फॉर्म कार्ड */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "17.5px", fontWeight: "800" }}>
            {editingId ? "✏ शेतकरी माहिती दुरुस्त करा" : "👨‍🌾 नवीन शेतकरी नोंदणी"}
          </h3>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={btnCancel}>
              ✖️ रद्द करा (Cancel)
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr 1.1fr 1.2fr auto",
            gap: "14px",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={labelStyle}>शेतकरी कोड *</label>
            <input
              type="text"
              placeholder="उदा. 101"
              value={form.farmer_code}
              onChange={(e) => setForm({ ...form, farmer_code: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>शेतकऱ्याचे नाव *</label>
            <input
              type="text"
              placeholder="उदा. सचिन पाटील"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>दुधाचा प्रकार</label>
            <select
              value={form.milk_type}
              onChange={(e) => setForm({ ...form, milk_type: e.target.value })}
              style={selectStyle}
            >
              <option value="COW">गाय (Cow)</option>
              <option value="BUFFALO">म्हैस (Buffalo)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>मोबाईल क्रमांक</label>
            <input
              type="text"
              placeholder="१० अंकी नंबर"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              style={editingId ? btnUpdate : btnSave}
            >
              {loading ? "..." : editingId ? "💾 अपडेट करा" : "➕ नोंदवा"}
            </button>
          </div>
        </div>
      </form>

      {/* २. नोंदणीकृत शेतकरी यादी व सर्च कार्ड */}
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
              📋 नोंदणीकृत शेतकरी यादी (एकूण: {farmers.length})
            </h4>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12px" }}>
              सर्व नोंदणीकृत शेतकरी आणि त्यांचे दुधाचे प्रकार
            </p>
          </div>

          <div style={{ minWidth: "260px" }}>
            <input
              type="text"
              placeholder="🔍 कोड, नाव किंवा फोनने शोधा..."
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
                <th style={th}>कोड</th>
                <th style={th}>शेतकऱ्याचे नाव</th>
                <th style={th}>दुधाचा प्रकार</th>
                <th style={th}>मोबाईल</th>
                <th style={th}>नोंदणी दिनांक</th>
                <th style={th}>शेवटचा बदल (Update)</th>
                <th style={{ ...th, textAlign: "center" }}>कृती (Action)</th>
              </tr>
            </thead>
            <tbody>
              {filteredFarmers.map((f) => {
                const isEdited = f.updated_at && f.updated_at !== f.created_at;
                return (
                  <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}>
                      <span style={codeBadge}>{f.farmer_code}</span>
                    </td>
                    <td style={{ ...td, fontWeight: "700", color: "#0f172a" }}>{f.full_name}</td>
                    <td style={td}>
                      <span style={f.milk_type === "BUFFALO" ? buffBadge : cowBadge}>
                        {f.milk_type === "BUFFALO" ? "म्हैस" : "गाय"}
                      </span>
                    </td>
                    <td style={td}>{f.phone || "-"}</td>
                    <td style={{ ...td, color: "#475569" }}>{formatDate(f.created_at)}</td>
                    <td style={{ ...td, fontSize: "12px" }}>
                      {isEdited ? (
                        <span style={{ color: "#b45309", fontWeight: "700", background: "#fef3c7", padding: "3px 6px", borderRadius: "5px", border: "1px solid #fde68a" }}>
                          🕒 {formatDateTime(f.updated_at)}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>- बदल नाही -</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <button
                        onClick={() => handleEdit(f)}
                        style={btnEdit}
                        title="माहिती दुरुस्त करा"
                      >
                        ✏️ एडिट
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredFarmers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "26px", color: "#94a3b8" }}>
                    कोणताही शेतकरी सापडला नाही.
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
  background: "#f8fafc",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const searchInputStyle = {
  width: "100%",
  padding: "8px 14px",
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

const btnUpdate = {
  padding: "10px 18px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
};

const btnCancel = {
  padding: "5px 12px",
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

const btnEdit = {
  padding: "5px 10px",
  background: "#eff6ff",
  color: "#2563eb",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "700",
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

const cowBadge = {
  background: "#eff6ff",
  color: "#2563eb",
  padding: "3px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "700",
};

const buffBadge = {
  background: "#f8fafc",
  color: "#334155",
  padding: "3px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "700",
  border: "1px solid #e2e8f0",
};