import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000/api";

export default function RateSettings({ dairyId = 1 }) {
  const [rates, setRates] = useState({
    cow_base_rate: 25.0,
    cow_base_fat: 3.5,
    cow_fat_rate: 4.5,
    cow_snf_rate: 2.0,
    buff_base_rate: 45.0,
    buff_base_fat: 6.0,
    buff_fat_rate: 5.5,
    buff_snf_rate: 2.5,
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // सध्याचे दर आणणे
  useEffect(() => {
    fetch(`${API_BASE}/rate-settings?dairy_id=${dairyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setRates({
            cow_base_rate: data.cow_base_rate || 25.0,
            cow_base_fat: data.cow_base_fat || 3.5,
            cow_fat_rate: data.cow_fat_rate || 4.5,
            cow_snf_rate: data.cow_snf_rate || 2.0,
            buff_base_rate: data.buff_base_rate || 45.0,
            buff_base_fat: data.buff_base_fat || 6.0,
            buff_fat_rate: data.buff_fat_rate || 5.5,
            buff_snf_rate: data.buff_snf_rate || 2.5,
          });
        }
      })
      .catch((err) => console.error("Rate fetch error:", err));
  }, [dairyId]);

  const handleChange = (e) => {
    setRates({ ...rates, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  // नवीन दर सेव्ह करणे
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/rate-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rates, dairy_id: dairyId }),
      });
      if (res.ok) {
        setMsg("✅ दरपत्रक यशस्वीरीत्या अपडेट झाले!");
      } else {
        setMsg("❌ दर सेव्ह करताना त्रुटी आली.");
      }
    } catch (err) {
      setMsg("❌ सर्व्हर एरर आला!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "850px", margin: "0 auto", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ background: "#fff", padding: "24px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚙️ दरपत्रक व्यवस्थापन (Rate Chart Settings)
        </h3>

        {msg && (
          <div style={{ padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontWeight: "bold", background: msg.includes("✅") ? "#ecfdf5" : "#fef2f2", color: msg.includes("✅") ? "#047857" : "#b91c1c" }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            
            {/* १. गाय दरपत्रक */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "16px", background: "#f8fafc" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#0369a1" }}>🐄 गाय दूध दर सूत्र (Cow Rate)</h4>
              
              <div style={{ marginBottom: "10px" }}>
                <label style={lbl}>बेस दर (Base Rate ₹):</label>
                <input type="number" step="0.1" name="cow_base_rate" value={rates.cow_base_rate} onChange={handleChange} style={inp} required />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={lbl}>बेस फॅट (Base FAT):</label>
                <input type="number" step="0.1" name="cow_base_fat" value={rates.cow_base_fat} onChange={handleChange} style={inp} required />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={lbl}>प्रति फॅट वाढ/घट दर (₹):</label>
                <input type="number" step="0.1" name="cow_fat_rate" value={rates.cow_fat_rate} onChange={handleChange} style={inp} required />
              </div>
              <div>
                <label style={lbl}>प्रति SNF वाढ दर (₹):</label>
                <input type="number" step="0.1" name="cow_snf_rate" value={rates.cow_snf_rate} onChange={handleChange} style={inp} required />
              </div>
            </div>

            {/* २. म्हैस दरपत्रक */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "16px", background: "#f8fafc" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#475569" }}>🐃 म्हैस दूध दर सूत्र (Buffalo Rate)</h4>
              
              <div style={{ marginBottom: "10px" }}>
                <label style={lbl}>बेस दर (Base Rate ₹):</label>
                <input type="number" step="0.1" name="buff_base_rate" value={rates.buff_base_rate} onChange={handleChange} style={inp} required />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={lbl}>बेस फॅट (Base FAT):</label>
                <input type="number" step="0.1" name="buff_base_fat" value={rates.buff_base_fat} onChange={handleChange} style={inp} required />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={lbl}>प्रति फॅट वाढ/घट दर (₹):</label>
                <input type="number" step="0.1" name="buff_fat_rate" value={rates.buff_fat_rate} onChange={handleChange} style={inp} required />
              </div>
              <div>
                <label style={lbl}>प्रति SNF वाढ दर (₹):</label>
                <input type="number" step="0.1" name="buff_snf_rate" value={rates.buff_snf_rate} onChange={handleChange} style={inp} required />
              </div>
            </div>

          </div>

          <button type="submit" disabled={loading} style={btnSave}>
            {loading ? "सेव्ह करत आहे..." : "💾 दरपत्रक अपडेट करा (Save Rates)"}
          </button>
        </form>
      </div>
    </div>
  );
}

const lbl = { display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600", color: "#334155" };
const inp = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box", background: "#fff" };
const btnSave = { width: "100%", padding: "10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" };