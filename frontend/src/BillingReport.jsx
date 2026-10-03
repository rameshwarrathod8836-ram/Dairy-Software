import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000/api";

export default function BillingReport({ dairyId = 1, dairyInfo }) {
  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getTodayDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [farmerCode, setFarmerCode] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [currentFarmerMilkType, setCurrentFarmerMilkType] = useState("");
  const [reportData, setReportData] = useState([]);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);

  const formatRawDate = (dateVal) => {
    if (!dateVal) return "";
    const str = String(dateVal).split("T")[0];
    const parts = str.split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : str;
  };

  const setQuickPeriod = (period) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).getDate();

    if (period === 1) {
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-10`);
    } else if (period === 2) {
      setStartDate(`${year}-${month}-11`);
      setEndDate(`${year}-${month}-20`);
    } else if (period === 3) {
      setStartDate(`${year}-${month}-21`);
      setEndDate(`${year}-${month}-${lastDayOfMonth}`);
    }
  };

  const fetchReport = async (
    sDate = startDate,
    eDate = endDate,
    fCode = farmerCode
  ) => {
    if (!fCode || fCode.trim() === "") {
      alert("कृपया आधी शेतकरी कोड टाका!");
      setReportData([]);
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/billing-report?dairy_id=${dairyId}&start_date=${sDate}&end_date=${eDate}&farmer_code=${fCode.trim()}`;
      const res = await fetch(url);
      const data = await res.json();
      setReportData(data || []);

      if (fCode && fCode.trim() !== "") {
        const advRes = await fetch(
          `${API_BASE}/advances/pending?dairy_id=${dairyId}&farmer_code=${fCode.trim()}`
        );
        const advData = await advRes.json();
        setAdvanceAmount(parseFloat(advData.total_advance || 0));

        // शेतकऱ्याचा सध्याचा खरा प्रकार व फोन आणणे
        const fRes = await fetch(
          `${API_BASE}/farmers?dairy_id=${dairyId}&farmer_code=${fCode.trim()}`
        );
        const fData = await fRes.json();
        if (fData && fData.length > 0) {
          setFarmerPhone(fData[0].phone || "");
          setCurrentFarmerMilkType(fData[0].milk_type || "COW");
        } else {
          setFarmerPhone("");
          setCurrentFarmerMilkType("");
        }
      } else {
        setAdvanceAmount(0);
        setFarmerPhone("");
        setCurrentFarmerMilkType("");
      }
    } catch (err) {
      alert("बिल रिपोर्ट लोड करताना त्रुटी आली!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReportData([]);
  }, [dairyId]);

  const handleSettlePayment = async () => {
    if (!farmerCode || farmerCode.trim() === "") {
      alert("कृपया आधी विशिष्ट शेतकरी कोड टाकून बिल शोधा!");
      return;
    }

    const confirmAction = window.confirm(
      `शेतकरी [${farmerCode}] ला रक्कम दिल्याची खात्री आहे का? यामुळे त्यांची जुनी शिल्लक उचल (₹ ${advanceAmount.toFixed(2)}) पूर्ण कपात म्हणून नोंद होईल.`
    );
    if (!confirmAction) return;

    setSettling(true);
    try {
      const res = await fetch(`${API_BASE}/advances/deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dairy_id: dairyId,
          farmer_code: farmerCode.trim(),
        }),
      });

      if (res.ok) {
        alert("पेमेंट पूर्ण झाले आणि उचल यशस्वीरीत्या वजा झाली!");
        fetchReport(startDate, endDate, farmerCode);
      } else {
        alert("कपात नोंदवताना त्रुटी आली.");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    } finally {
      setSettling(false);
    }
  };

  const morningEntries = reportData.filter((r) => r.shift === "MORNING");
  const eveningEntries = reportData.filter((r) => r.shift === "EVENING");

  const morningLiters = morningEntries.reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);
  const eveningLiters = eveningEntries.reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);
  const totalQty = reportData.reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);
  const grossAmount = reportData.reduce((acc, r) => acc + parseFloat(r.total_amount || 0), 0);
  const netPayable = grossAmount - advanceAmount;

  const avgFat =
    totalQty > 0
      ? (
          reportData.reduce(
            (acc, r) => acc + parseFloat(r.fat || 0) * parseFloat(r.quantity || 0),
            0
          ) / totalQty
        ).toFixed(2)
      : "0.00";

  const avgRate = totalQty > 0 ? (grossAmount / totalQty).toFixed(2) : "0.00";

  const sendWhatsAppBilling = () => {
    if (reportData.length === 0) return;

    let phone = farmerPhone;
    if (!phone || phone.trim().length < 10) {
      phone = prompt("शेतकऱ्याचा १० अंकी मोबाईल नंबर टाका:", "");
      if (!phone || phone.trim().length < 10) {
        alert("मोबाईल नंबर आवश्यक आहे!");
        return;
      }
    }

    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const dairyTitle = dairyInfo?.dairy_name || "जगदंब दूध संकलन केंद्र";
    const farmerTitle = reportData[0]?.farmer_name || "";
    const fCode = reportData[0]?.farmer_code || farmerCode;

    const msg =
      `*🥛 ${dairyTitle} 🥛*\n` +
      `*दूध देयक बिल (Payment Statement)*\n` +
      `--------------------------------\n` +
      `शेतकरी: *[${fCode}] ${farmerTitle}*\n` +
      `कालावधी: *${formatRawDate(startDate)} ते ${formatRawDate(endDate)}*\n` +
      `एकूण नोंदी: *${reportData.length} शिफ्ट्स*\n` +
      `--------------------------------\n` +
      `☀️ सकाळचे दूध: *${morningLiters.toFixed(2)} L*\n` +
      `🌙 संध्याकाळचे दूध: *${eveningLiters.toFixed(2)} L*\n` +
      `🥛 एकूण दूध: *${totalQty.toFixed(2)} लिटर*\n` +
      `सरासरी FAT: *${avgFat}*\n` +
      `सरासरी दर: *₹ ${avgRate}*\n` +
      `एकूण दूध बिल: *₹ ${grossAmount.toFixed(2)}*\n` +
      (advanceAmount > 0
        ? `वजा उचल (Advance): *- ₹ ${advanceAmount.toFixed(2)}*\n`
        : "") +
      `--------------------------------\n` +
      `*👉 निव्वळ देय रक्कम: ₹ ${netPayable.toFixed(2)}*\n` +
      `--------------------------------\n` +
      `धन्यवाद! 🙏`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert("डाउनलोड करण्यासाठी आधी डेटा शोधा!");
      return;
    }
    const headers = [
      "दिनांक",
      "वेळ",
      "शिफ्ट",
      "कोड",
      "नाव",
      "प्रकार",
      "दूध (L)",
      "FAT",
      "SNF",
      "दर",
      "रक्कम",
    ];
    const rows = reportData.map((r) => [
      formatRawDate(r.entry_date),
      r.entry_time || "-",
      r.shift === "MORNING" ? "सकाळ" : "संध्याकाळ",
      r.farmer_code,
      `"${r.farmer_name}"`,
      r.milk_type === "COW" ? "गाय" : "म्हैस",
      r.quantity,
      r.fat,
      r.snf,
      r.rate,
      r.total_amount,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Milk_Bill_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* १. आधुनिक फिल्टर कार्ड */}
      <div
        className="no-print"
        style={{
          background: "#ffffff",
          padding: "24px",
          borderRadius: "14px",
          boxShadow: "0 4px 18px -2px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: "700" }}>
              📄 १० दिवसांचे बिल / पेमेंट रजिस्टर
            </h3>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
              कालावधी निवडा व एका क्लिकवर हिशोब तपासा
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setQuickPeriod(1)} style={quickBtn}>
              📅 १ ते १०
            </button>
            <button type="button" onClick={() => setQuickPeriod(2)} style={quickBtn}>
              📅 ११ ते २०
            </button>
            <button type="button" onClick={() => setQuickPeriod(3)} style={quickBtn}>
              📅 २१ ते अखेर
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr auto", gap: "16px", alignItems: "flex-end" }}>
          <div>
            <label style={uiLabel}>सुरुवात दिनांक</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={uiInput}
            />
          </div>
          <div>
            <label style={uiLabel}>शेवट दिनांक</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={uiInput}
            />
          </div>
          <div>
            <label style={uiLabel}>शेतकरी कोड (उदा. 101)</label>
            <input
              type="text"
              placeholder="शेतकरी कोड टाका (उदा. 101)"
              value={farmerCode}
              onChange={(e) => setFarmerCode(e.target.value)}
              style={uiInput}
            />
          </div>
          <div>
            <button
              onClick={() => fetchReport(startDate, endDate, farmerCode)}
              style={searchBtn}
            >
              {loading ? "शोधत आहे..." : "🔍 रिपोर्ट पहा"}
            </button>
          </div>
        </div>
      </div>

      {/* २. ॲक्शन बार */}
      {reportData.length > 0 && (
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          {farmerCode && advanceAmount > 0 ? (
            <button
              onClick={handleSettlePayment}
              disabled={settling}
              style={settleBtn}
            >
              {settling
                ? "नोंद होत आहे..."
                : `✅ उचल कपात नोंदवा (₹ ${advanceAmount.toFixed(2)})`}
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            {farmerCode && (
              <button onClick={sendWhatsAppBilling} style={waBtn}>
                💬 WhatsApp वर पाठवा
              </button>
            )}
            <button onClick={exportToCSV} style={excelBtn}>
              📊 Excel डाऊनलोड
            </button>
            <button onClick={() => window.print()} style={printBtn}>
              🖨️ देयक बिल प्रिंट
            </button>
          </div>
        </div>
      )}

      {/* ३. मुख्य पावती */}
      {reportData.length > 0 ? (
        <div
          id="billing-printable-area"
          style={{
            background: "#ffffff",
            border: "2px solid #0f172a",
            borderRadius: "8px",
            padding: "24px 28px",
            boxSizing: "border-box",
            color: "#0f172a",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* १. स्पष्ट आणि ठळक हेडर */}
          <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #0f172a", paddingBottom: "12px" }}>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: "900", color: "#0f172a", letterSpacing: "0.5px" }}>
              {dairyInfo?.dairy_name || "जगदंब दूध संकलन केंद्र"}
            </h1>
            {(dairyInfo?.address || dairyInfo?.phone) && (
              <div style={{ fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                {dairyInfo?.address} {dairyInfo?.phone ? `• मो. ${dairyInfo.phone}` : ""}
              </div>
            )}
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>
              दूध उत्पादक १० दिवसांचे देयक बिल (Payment Statement)
            </div>
          </div>

          {/* २. माहिती तपशील */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            <div>
              <div>शेतकरी कोड: <b style={{ color: "#1e3a8a" }}>{farmerCode || reportData[0]?.farmer_code || "-"}</b></div>
              <div>शेतकऱ्याचे नाव: <b style={{ fontSize: "15px" }}>{reportData[0]?.farmer_name || "-"}</b></div>
              <div>
                नोंदणीकृत प्रकार: <b>{currentFarmerMilkType === "BUFFALO" ? "म्हैस (Buffalo)" : "गाय (Cow)"}</b>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>
                बिल कालावधी: <b>{formatRawDate(startDate)} ते {formatRawDate(endDate)}</b>
              </div>
              <div>बिल दिनांक: <b>{formatRawDate(today)}</b></div>
            </div>
          </div>

          {/* ३. मुख्य डेटा टेबल (प्रकार आणि वेळेसह) */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "center",
              border: "1.5px solid #0f172a",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #0f172a" }}>
                <th style={thStyle}>दिनांक व वेळ</th>
                <th style={thStyle}>शिफ्ट</th>
                <th style={thStyle}>प्रकार</th>
                <th style={thStyle}>दूध (L)</th>
                <th style={thStyle}>FAT (%)</th>
                <th style={thStyle}>SNF (%)</th>
                <th style={thStyle}>दर (₹/L)</th>
                <th style={thStyle}>रक्कम (₹)</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <td style={tdStyle}>
                    <b>{formatRawDate(row.entry_date)}</b>
                    {row.entry_time && (
                      <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                        {row.entry_time}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {row.shift === "MORNING" ? "☀️ सकाळ" : "🌙 संध्याकाळ"}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        background: row.milk_type === "BUFFALO" ? "#f1f5f9" : "#eff6ff",
                        color: row.milk_type === "BUFFALO" ? "#1e293b" : "#2563eb",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {row.milk_type === "BUFFALO" ? "म्हैस" : "गाय"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: "700" }}>
                    {parseFloat(row.quantity).toFixed(2)} L
                  </td>
                  <td style={tdStyle}>{parseFloat(row.fat).toFixed(2)}%</td>
                  <td style={tdStyle}>{parseFloat(row.snf).toFixed(2)}%</td>
                  <td style={tdStyle}>₹ {parseFloat(row.rate).toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: "700", color: "#166534" }}>
                    ₹ {parseFloat(row.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ४. सारांश बॉक्सेस */}
          <div
            style={{
              border: "1.5px solid #0f172a",
              borderTop: "none",
              display: "grid",
              gridTemplateColumns: "1.2fr 1.2fr 1fr",
              fontSize: "13.5px",
              lineHeight: "1.9",
              background: "#ffffff",
            }}
          >
            <div style={{ padding: "8px 14px", borderRight: "1.5px solid #0f172a" }}>
              ☀️ सकाळचे दूध: <b>{morningLiters.toFixed(2)} L</b>
            </div>
            <div style={{ padding: "8px 14px", borderRight: "1.5px solid #0f172a" }}>
              🌙 संध्याकाळचे दूध: <b>{eveningLiters.toFixed(2)} L</b>
            </div>
            <div style={{ padding: "8px 14px" }}>
              🥛 एकूण दूध: <b>{totalQty.toFixed(2)} L</b>
            </div>
          </div>

          <div
            style={{
              border: "1.5px solid #0f172a",
              borderTop: "none",
              display: "grid",
              gridTemplateColumns: "1.2fr 1.2fr 1fr",
              fontSize: "14px",
              lineHeight: "2",
              background: "#f0fdf4",
            }}
          >
            <div style={{ padding: "8px 14px", borderRight: "1.5px solid #0f172a" }}>
              सरासरी FAT: <b>{avgFat}%</b>
            </div>
            <div style={{ padding: "8px 14px", borderRight: "1.5px solid #0f172a" }}>
              सरासरी दर: <b>₹ {avgRate}</b>
            </div>
            <div
              style={{
                padding: "8px 14px",
                fontWeight: "800",
                fontSize: "15px",
                color: "#166534",
              }}
            >
              एकूण दूध बिल: ₹ {grossAmount.toFixed(2)}
            </div>
          </div>

          {/* ५. उचल व निव्वळ देय रक्कम */}
          <div
            style={{
              border: "1.5px solid #0f172a",
              borderTop: "none",
              display: "grid",
              gridTemplateColumns: "2.4fr 1fr",
              fontSize: "14px",
              lineHeight: "1.9",
              background: advanceAmount > 0 ? "#fef2f2" : "#ffffff",
              color: advanceAmount > 0 ? "#dc2626" : "#475569",
              fontWeight: "700",
            }}
          >
            <div style={{ padding: "8px 14px", borderRight: "1.5px solid #0f172a", textAlign: "right" }}>
              - वजा शेतकरी उचल / पशूखाद्य कपात:
            </div>
            <div style={{ padding: "8px 14px" }}>
              - ₹ {advanceAmount.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              border: "1.5px solid #0f172a",
              borderTop: "none",
              display: "grid",
              gridTemplateColumns: "2.4fr 1fr",
              fontSize: "15px",
              lineHeight: "2.2",
              background: "#dcfce7",
              color: "#15803d",
              fontWeight: "800",
            }}
          >
            <div style={{ padding: "8px 14px", borderRight: "1.5px solid #0f172a", textAlign: "right" }}>
              👉 निव्वळ देय रक्कम (Net Payable):
            </div>
            <div style={{ padding: "8px 14px" }}>
              ₹ {netPayable.toFixed(2)}
            </div>
          </div>

          {/* ६. स्वाक्षरी विभाग */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "50px",
              padding: "0 30px",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            <div>शेतकऱ्याची सही</div>
            <div>डेअरी चालकाची सही / शिक्का</div>
          </div>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px dashed #cbd5e1",
            color: "#64748b",
          }}
        >
          कालावधी व शेतकरी कोड टाकून <b>'🔍 रिपोर्ट पहा'</b> वर क्लिक करा.
        </div>
      )}

      {/* प्रिंटिंग नियम */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #billing-printable-area, #billing-printable-area * {
            visibility: visible !important;
          }
          #billing-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            padding: 16px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// UI/UX स्टाईल्स
const uiLabel = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#334155",
};

const uiInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "500",
  boxSizing: "border-box",
  outline: "none",
  transition: "all 0.2s ease",
};

const searchBtn = {
  padding: "10px 20px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
  boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
};

const quickBtn = {
  padding: "6px 12px",
  background: "#f1f5f9",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

const waBtn = {
  padding: "9px 16px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
};

const excelBtn = {
  padding: "9px 16px",
  background: "#0284c7",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  boxShadow: "0 2px 4px rgba(2, 132, 199, 0.2)",
};

const printBtn = {
  padding: "9px 16px",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  boxShadow: "0 2px 4px rgba(15, 23, 42, 0.2)",
};

const settleBtn = {
  padding: "9px 16px",
  background: "#d97706",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const thStyle = {
  padding: "10px 8px",
  border: "1px solid #0f172a",
  fontWeight: "700",
  fontSize: "13px",
  color: "#0f172a",
};

const tdStyle = {
  padding: "8px 8px",
  border: "1px solid #cbd5e1",
  color: "#1e293b",
};