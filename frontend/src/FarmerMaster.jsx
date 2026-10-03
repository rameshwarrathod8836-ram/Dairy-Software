import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000/api";

export default function FarmerMaster({ onBack }) {
  const [farmers, setFarmers] = useState([]);
  const [formData, setFormData] = useState({
    farmer_code: "",
    full_name: "",
    milk_type: "COW",
    phone: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadFarmers = async () => {
    try {
      const res = await fetch(`${API_BASE}/farmers`);
      if (res.ok) {
        const data = await res.json();
        setFarmers(data);
      }
    } catch (err) {
      console.error("शेतकरी लोड करताना त्रुटी:", err);
    }
  };

  useEffect(() => {
    loadFarmers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.farmer_code || !formData.full_name) {
      setErrorMsg("कृपया शेतकरी कोड आणि नाव भरा!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/farmers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`शेतकरी ${formData.full_name} यांची नोंदणी यशस्वी झाली!`);
        setFormData({
          farmer_code: "",
          full_name: "",
          milk_type: "COW",
          phone: "",
        });
        loadFarmers();
      } else {
        setErrorMsg(data.message || "नोंदणी करताना अडचण आली.");
      }
    } catch (err) {
      setErrorMsg("सर्व्हरशी संपर्क होऊ शकला नाही!");
    }
  };

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "20px auto",
        fontFamily: "Segoe UI, sans-serif",
        color: "#1e293b",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
          color: "#fff",
          padding: "18px 24px",
          borderRadius: "10px 10px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "22px" }}>
            👨‍🌾 शेतकरी नोंदणी व यादी
          </h2>
          <p style={{ margin: "4px 0 0 0", opacity: 0.85, fontSize: "13px" }}>
            नवीन दूध उत्पादक शेतकरी नोंदवा आणि माहिती व्यवस्थापित करा
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            background: "#ffffff",
            color: "#1e3a8a",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ⬅ दूध संकलनकडे परत जा
        </button>
      </div>

      {/* Registration Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          padding: "20px",
          border: "1px solid #cbd5e1",
        }}
      >
        {errorMsg && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "8px 12px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              background: "#dcfce7",
              color: "#16a34a",
              padding: "8px 12px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            {successMsg}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "14px",
          }}
        >
          <div>
            <label style={labelStyle}>शेतकरी कोड (Code) *</label>
            <input
              type="text"
              placeholder="उदा. 105"
              value={formData.farmer_code}
              onChange={(e) =>
                setFormData({ ...formData, farmer_code: e.target.value.trim() })
              }
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>शेतकऱ्याचे नाव *</label>
            <input
              type="text"
              placeholder="उदा. राहुल गायकवाड"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>दुधाचा प्रकार</label>
            <select
              value={formData.milk_type}
              onChange={(e) =>
                setFormData({ ...formData, milk_type: e.target.value })
              }
              style={inputStyle}
            >
              <option value="COW">गाय (Cow)</option>
              <option value="BUFFALO">म्हैस (Buffalo)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>मोबाईल क्रमांक</label>
            <input
              type="tel"
              placeholder="१० अंकी नंबर"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: "16px",
            width: "100%",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            padding: "11px",
            fontSize: "15px",
            fontWeight: "bold",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ➕ नवीन शेतकरी नोंदवा
        </button>
      </form>

      {/* Registered Farmers Table */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #cbd5e1",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 18px",
            background: "#f8fafc",
            borderBottom: "1px solid #cbd5e1",
            fontWeight: 600,
            color: "#334155",
          }}
        >
          नोंदणीकृत शेतकरी यादी (एकूण: {farmers.length})
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                fontSize: "13px",
              }}
            >
              <th style={thStyle}>कोड</th>
              <th style={thStyle}>शेतकऱ्याचे नाव</th>
              <th style={thStyle}>दुधाचा प्रकार</th>
              <th style={thStyle}>मोबाईल</th>
              <th style={thStyle}>नोंदणी दिनांक</th>
            </tr>
          </thead>
          <tbody>
            {farmers.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "#64748b",
                  }}
                >
                  अजून शेतकरी नोंदणी झालेली नाही.
                </td>
              </tr>
            ) : (
              farmers.map((f) => (
                <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}>
                    <strong>{f.farmer_code}</strong>
                  </td>
                  <td style={tdStyle}>{f.full_name}</td>
                  <td style={tdStyle}>
                    {f.milk_type === "COW" ? "गाय" : "म्हैस"}
                  </td>
                  <td style={tdStyle}>{f.phone || "-"}</td>
                  <td style={tdStyle}>
                    {f.created_at
                      ? new Date(f.created_at).toLocaleDateString("en-IN")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "4px",
  display: "block",
};
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  boxSizing: "border-box",
};
const thStyle = { padding: "10px 14px", color: "#475569", fontWeight: 600 };
const tdStyle = { padding: "10px 14px", fontSize: "14px" };
