import React, { useState, useEffect, useRef } from "react";

const API_BASE = "https://dairy-software-vhh4.onrender.com/api";

export default function MilkCollection({ dairyId = 1, dairyInfo }) {
  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getCurrentShift = () => {
    const hours = new Date().getHours();
    return hours < 15 ? "MORNING" : "EVENING";
  };

  const [entryDate, setEntryDate] = useState(getTodayDate());
  const [shift, setShift] = useState(getCurrentShift());
  const [farmerCode, setFarmerCode] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [milkType, setMilkType] = useState("COW");
  const [quantity, setQuantity] = useState("");
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [rate, setRate] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // आजच्या पूर्ण दिवसाच्या सर्व नोंदी (सकाळ + संध्याकाळ)
  const [allDayEntries, setAllDayEntries] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);

  // कीबोर्ड फोकस रेफ्स
  const farmerInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const fatInputRef = useRef(null);
  const snfInputRef = useRef(null);

  // दरपत्रक स्टेट्स
  const [rateChart, setRateChart] = useState({
    cow_base_rate: 25.0,
    cow_base_fat: 3.5,
    cow_fat_rate: 4.5,
    cow_snf_rate: 2.0,
    buff_base_rate: 45.0,
    buff_base_fat: 6.0,
    buff_fat_rate: 5.5,
    buff_snf_rate: 2.5,
  });

  // दरपत्रक लोड करणे
  useEffect(() => {
    fetch(`${API_BASE}/rate-settings?dairy_id=${dairyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.cow_base_rate) {
          setRateChart(data);
        }
      })
      .catch((err) => console.error("Rate Chart Load Error:", err));
  }, [dairyId]);

  // शेतकरी कोडवरून नाव व माहिती आणणे
  const handleFarmerCodeChange = async (e) => {
    const code = e.target.value;
    setFarmerCode(code);

    if (code.trim() !== "") {
      try {
        const res = await fetch(`${API_BASE}/farmers?dairy_id=${dairyId}&farmer_code=${code.trim()}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setFarmerName(data[0].full_name);
          setMilkType(data[0].milk_type || "COW");
          setFarmerPhone(data[0].phone || "");
        } else {
          setFarmerName("");
          setFarmerPhone("");
        }
      } catch (err) {
        console.error("Farmer fetch error:", err);
      }
    } else {
      setFarmerName("");
      setFarmerPhone("");
    }
  };

  // दर आणि एकूण रक्कम स्वयंचलित कॅल्क्युलेट करणे
  useEffect(() => {
    const f = parseFloat(fat) || 0;
    const s = parseFloat(snf) || 0;
    const q = parseFloat(quantity) || 0;

    let calculatedRate = 0;
    if (f > 0) {
      if (milkType === "COW") {
        const baseRate = parseFloat(rateChart.cow_base_rate) || 25.0;
        const baseFat = parseFloat(rateChart.cow_base_fat) || 3.5;
        const fatRate = parseFloat(rateChart.cow_fat_rate) || 4.5;
        const snfRate = parseFloat(rateChart.cow_snf_rate) || 2.0;

        calculatedRate = baseRate + (f - baseFat) * fatRate + (s > 8.5 ? (s - 8.5) * snfRate : 0);
      } else {
        const baseRate = parseFloat(rateChart.buff_base_rate) || 45.0;
        const baseFat = parseFloat(rateChart.buff_base_fat) || 6.0;
        const fatRate = parseFloat(rateChart.buff_fat_rate) || 5.5;
        const snfRate = parseFloat(rateChart.buff_snf_rate) || 2.5;

        calculatedRate = baseRate + (f - baseFat) * fatRate + (s > 9.0 ? (s - 9.0) * snfRate : 0);
      }
      calculatedRate = Math.max(calculatedRate, 20);
    }

    setRate(calculatedRate.toFixed(2));
    setTotalAmount((calculatedRate * q).toFixed(2));
  }, [fat, snf, quantity, milkType, rateChart]);

  // आजच्या सकाळ आणि संध्याकाळ दोन्ही शिफ्ट्सचा डेटा एकत्र लोड करणे
  const fetchAllDayData = async () => {
    try {
      const [resM, resE] = await Promise.all([
        fetch(`${API_BASE}/collections/recent?dairy_id=${dairyId}&date=${entryDate}&shift=MORNING`),
        fetch(`${API_BASE}/collections/recent?dairy_id=${dairyId}&date=${entryDate}&shift=EVENING`)
      ]);

      const dataM = (await resM.json()) || [];
      const dataE = (await resE.json()) || [];

      const combined = [...dataM, ...dataE];
      setAllDayEntries(combined);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  useEffect(() => {
    fetchAllDayData();
  }, [entryDate, dairyId]);

  useEffect(() => {
    farmerInputRef.current?.focus();
  }, []);

  // Enter कीबोर्ड नेव्हिगेशन
  const handleKeyDown = (e, nextField) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextField === "qty") {
        qtyInputRef.current?.focus();
      } else if (nextField === "fat") {
        fatInputRef.current?.focus();
      } else if (nextField === "snf") {
        snfInputRef.current?.focus();
      } else if (nextField === "save") {
        handleSubmit(e);
      }
    }
  };

  // नोंद सेव्ह करणे
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!farmerName) {
      alert("कृपया वैध शेतकरी कोड टाका!");
      farmerInputRef.current?.focus();
      return;
    }
    if (!quantity || quantity <= 0) {
      alert("दूध लिटरमध्ये टाका!");
      qtyInputRef.current?.focus();
      return;
    }

    const payload = {
      dairy_id: dairyId,
      entry_date: entryDate,
      shift,
      farmer_code: farmerCode,
      farmer_name: farmerName,
      milk_type: milkType,
      quantity: parseFloat(quantity),
      fat: parseFloat(fat) || 0,
      snf: parseFloat(snf) || 0,
      rate: parseFloat(rate),
      total_amount: parseFloat(totalAmount),
    };

    try {
      const res = await fetch(`${API_BASE}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        const receiptData = {
          ...payload,
          id: savedData.id || "नवीन",
          phone: farmerPhone,
          time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }),
        };
        setLastReceipt(receiptData);
        fetchAllDayData();

        // फॉर्म रीसेट
        setFarmerCode("");
        setFarmerName("");
        setFarmerPhone("");
        setQuantity("");
        setFat("");
        setSnf("");
        setTimeout(() => {
          farmerInputRef.current?.focus();
        }, 50);
      } else {
        alert("नोंद सेव्ह करताना त्रुटी आली!");
      }
    } catch (err) {
      alert("सर्व्हर एरर आला!");
    }
  };

  // ✅ WhatsApp पावती (Popup Blocker Fix + 91 Formatting)
  const sendWhatsAppReceipt = (receipt) => {
    const data = receipt || lastReceipt;
    if (!data) return;

    let phone = data.phone || farmerPhone;
    if (!phone || String(phone).trim().length < 10) {
      phone = prompt("शेतकऱ्याचा १० अंकी मोबाईल नंबर टाका:", "");
      if (!phone || String(phone).trim().length < 10) {
        alert("मोबाईल नंबर योग्य नाही!");
        return;
      }
    }

    let cleanPhone = String(phone).replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    const dairyTitle = dairyInfo?.dairy_name || "जगदंब दूध संकलन केंद्र";
    const shiftText = data.shift === "MORNING" ? "सकाळ" : "संध्याकाळ";
    const milkTypeText = data.milk_type === "COW" ? "गाय" : "म्हैस";

    const msg = `*🥛 ${dairyTitle} 🥛*\n` +
      `--------------------------------\n` +
      `पावती क्र: *#${data.id || ""}*\n` +
      `तारीख: *${data.entry_date} (${shiftText})*\n` +
      `शेतकरी: *${data.farmer_code} - ${data.farmer_name}*\n` +
      `प्रकार: *${milkTypeText}*\n` +
      `वजन: *${data.quantity} Ltr*\n` +
      `FAT: *${data.fat}* | SNF: *${data.snf}*\n` +
      `दर: *₹ ${data.rate}*\n` +
      `--------------------------------\n` +
      `*एकूण रक्कम: ₹ ${data.total_amount}*\n` +
      `--------------------------------\n` +
      `धन्यवाद! 🙏`;

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;

    // Chrome Popup Blocker बायपास करण्यासाठी Dynamic Link Click
    const tempLink = document.createElement("a");
    tempLink.href = waUrl;
    tempLink.target = "_blank";
    tempLink.rel = "noopener noreferrer";
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  };

  // प्रिंट करताना वेळ आणि तारीख अचूक सेट करणे
  const handlePrintEntry = (entry) => {
    const formattedEntry = {
      ...entry,
      entry_date: entry.entry_date
        ? String(entry.entry_date).split("T")[0].split("-").reverse().join("-")
        : entry.entry_date,
      time:
        entry.entry_time ||
        entry.time ||
        new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }),
    };
    setLastReceipt(formattedEntry);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // ================= 📊 दैनिक आकडेमोड =================
  const totalDayLiters = allDayEntries.reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);
  const morningEntries = allDayEntries.filter((r) => r.shift === "MORNING");
  const eveningEntries = allDayEntries.filter((r) => r.shift === "EVENING");

  const morningLiters = morningEntries.reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);
  const eveningLiters = eveningEntries.reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);

  const totalCowLiters = allDayEntries
    .filter((r) => r.milk_type === "COW")
    .reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);
  const totalBuffLiters = allDayEntries
    .filter((r) => r.milk_type === "BUFFALO")
    .reduce((acc, r) => acc + parseFloat(r.quantity || 0), 0);

  const totalDayAmount = allDayEntries.reduce((acc, r) => acc + parseFloat(r.total_amount || 0), 0);
  
  const avgDayFat = totalDayLiters > 0 
    ? (allDayEntries.reduce((acc, r) => acc + parseFloat(r.fat || 0) * parseFloat(r.quantity || 0), 0) / totalDayLiters).toFixed(2)
    : "0.0";

  const selectedShiftEntries = allDayEntries.filter((r) => r.shift === shift);

  return (
    <div style={{ maxWidth: "1150px", margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* थर्मल पावती स्टाइल */}
      <style>{`
        @media screen {
          .thermal-receipt-container {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          body * {
            visibility: hidden !important;
          }
          .thermal-receipt-container, .thermal-receipt-container * {
            visibility: visible !important;
          }
          .thermal-receipt-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 72mm !important;
            max-width: 72mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            color: #000 !important;
            background: #fff !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* थर्मल पावती लेआउट */}
      {lastReceipt && (
        <div className="thermal-receipt-container">
          <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
            <h3 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "bold" }}>
              {dairyInfo?.dairy_name || "जगदंब दूध संकलन केंद्र"}
            </h3>
            {dairyInfo?.address && <div style={{ fontSize: "11px" }}>{dairyInfo.address}</div>}
            {dairyInfo?.phone && <div style={{ fontSize: "11px" }}>मो. {dairyInfo.phone}</div>}
            <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "4px" }}>दूध संकलन पावती</div>
          </div>

          <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>पावती क्र: <b>#{lastReceipt.id}</b></span>
              <span>वेळ: <b>{lastReceipt.time || ""}</b></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>दिनांक: <b>{lastReceipt.entry_date}</b></span>
              <span>शिफ्ट: <b>{lastReceipt.shift === "MORNING" ? "सकाळ" : "संध्याकाळ"}</b></span>
            </div>
            <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }}></div>
            <div>शेतकरी: <b>[{lastReceipt.farmer_code}] {lastReceipt.farmer_name}</b></div>
            <div>प्रकार: <b>{lastReceipt.milk_type === "COW" ? "गाय (COW)" : "म्हैस (BUFFALO)"}</b></div>
            <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }}></div>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>दूध वजन:</span>
              <b>{parseFloat(lastReceipt.quantity).toFixed(2)} Ltr</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>FAT:</span>
              <b>{parseFloat(lastReceipt.fat).toFixed(1)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>SNF:</span>
              <b>{parseFloat(lastReceipt.snf).toFixed(1)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>दर:</span>
              <b>₹ {parseFloat(lastReceipt.rate).toFixed(2)}</b>
            </div>

            <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "6px 0", margin: "6px 0", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span><b>एकूण रक्कम:</b></span>
              <span><b>₹ {parseFloat(lastReceipt.total_amount).toFixed(2)}</b></span>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "11px", marginTop: "8px" }}>
            ** धन्यवाद! पुन्हा या! **
          </div>
        </div>
      )}

      {/* १. दैनिक सारांश डॅशबोर्ड */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr 1fr", gap: "16px", marginBottom: "22px" }}>
        <div style={{ ...kpiCard, borderTop: "4px solid #2563eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>आजचे एकूण दूध (दिवसभर)</div>
              <div style={{ ...kpiValue, color: "#1e3a8a" }}>
                {totalDayLiters.toFixed(1)} <span style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>Ltr</span>
              </div>
            </div>
            <span style={kpiIcon}>🥛</span>
          </div>
          <div style={kpiFooter}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <span>☀️ सकाळ: <b style={{ color: "#0284c7" }}>{morningLiters.toFixed(1)} L</b></span>
              <span>🌙 संध्याकाळ: <b style={{ color: "#d97706" }}>{eveningLiters.toFixed(1)} L</b></span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              गाय: <b>{totalCowLiters.toFixed(1)} L</b> • म्हैस: <b>{totalBuffLiters.toFixed(1)} L</b>
            </div>
          </div>
        </div>

        <div style={{ ...kpiCard, borderTop: "4px solid #0891b2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>सरासरी FAT (दिवसभर)</div>
              <div style={{ ...kpiValue, color: "#0e7490" }}>{avgDayFat}</div>
            </div>
            <span style={kpiIcon}>🧪</span>
          </div>
          <div style={kpiFooter}>
            दर्जेदार संकलन नोंद
          </div>
        </div>

        <div style={{ ...kpiCard, borderTop: "4px solid #16a34a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>आजची एकूण रक्कम</div>
              <div style={{ ...kpiValue, color: "#15803d" }}>₹ {totalDayAmount.toFixed(2)}</div>
            </div>
            <span style={kpiIcon}>💰</span>
          </div>
          <div style={kpiFooter}>
            सकाळ + संध्याकाळ देयक मूल्य
          </div>
        </div>

        <div style={{ ...kpiCard, borderTop: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={kpiLabel}>एकूण नोंदी पूर्ण</div>
              <div style={{ ...kpiValue, color: "#b45309" }}>{allDayEntries.length}</div>
            </div>
            <span style={kpiIcon}>👥</span>
          </div>
          <div style={kpiFooter}>
            सकाळ: <b>{morningEntries.length}</b> | संध्याकाळ: <b>{eveningEntries.length}</b>
          </div>
        </div>
      </div>

      {/* २. दूध संकलन फॉर्म */}
      <div className="no-print" style={formCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={headerIconBadge}>⚡</span>
            <div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: "800" }}>
                दूध संकलन नोंद <span style={{ color: "#2563eb", fontSize: "14px", fontWeight: "600" }}>(Fast Keyboard Entry)</span>
              </h3>
              <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12.5px" }}>
                Enter दाबून पटापट पुढे जा व नोंद सेव्ह करा
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.1fr 1.4fr", gap: "14px", marginBottom: "16px" }}>
            <div>
              <label style={uiLabel}>तारीख</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={modernInput} />
            </div>
            <div>
              <label style={uiLabel}>शिफ्ट (नोंद व फिल्टर)</label>
              <select value={shift} onChange={(e) => setShift(e.target.value)} style={modernSelect}>
                <option value="MORNING">☀️ सकाळ</option>
                <option value="EVENING">🌙 संध्याकाळ</option>
              </select>
            </div>
            <div>
              <label style={uiLabel}>
                शेतकरी कोड <span style={{ color: "#2563eb" }}>(Enter ↵)</span>
              </label>
              <input 
                ref={farmerInputRef} 
                type="text" 
                placeholder="उदा. 101" 
                value={farmerCode} 
                onChange={handleFarmerCodeChange} 
                onKeyDown={(e) => handleKeyDown(e, "qty")}
                style={{ ...modernInput, border: "2px solid #2563eb", background: "#f8fafc" }} 
                required 
              />
            </div>
            <div>
              <label style={uiLabel}>शेतकऱ्याचे नाव</label>
              <input 
                type="text" 
                value={farmerName} 
                placeholder="नाव आपोआप येईल" 
                style={readonlyInput} 
                readOnly 
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr 1.1fr 1.3fr", gap: "14px", marginBottom: "20px", alignItems: "flex-end" }}>
            <div>
              <label style={uiLabel}>प्रकार</label>
              <select value={milkType} onChange={(e) => setMilkType(e.target.value)} style={modernSelect}>
                <option value="COW">गाय (COW)</option>
                <option value="BUFFALO">म्हैस (BUFFALO)</option>
              </select>
            </div>
            <div>
              <label style={uiLabel}>दूध (Ltr) ↵</label>
              <input 
                ref={qtyInputRef}
                type="number" 
                step="0.1" 
                placeholder="0.0" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "fat")}
                style={modernInput} 
                required 
              />
            </div>
            <div>
              <label style={uiLabel}>FAT ↵</label>
              <input 
                ref={fatInputRef}
                type="number" 
                step="0.1" 
                placeholder="0.0" 
                value={fat} 
                onChange={(e) => setFat(e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "snf")}
                style={modernInput} 
              />
            </div>
            <div>
              <label style={uiLabel}>SNF ↵</label>
              <input 
                ref={snfInputRef}
                type="number" 
                step="0.1" 
                placeholder="0.0" 
                value={snf} 
                onChange={(e) => setSnf(e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "save")}
                style={modernInput} 
              />
            </div>
            
            <div>
              <label style={uiLabel}>दर (₹/L)</label>
              <div style={rateBadge}>
                ₹ {rate || "0.00"}
              </div>
            </div>

            <div>
              <label style={uiLabel}>एकूण रक्कम (₹)</label>
              <div style={amountBadge}>
                ₹ {totalAmount || "0.00"}
              </div>
            </div>
          </div>

          <button type="submit" style={btnSubmitModern}>
            <span>➕ दूध नोंदवा (Save / Enter ↵)</span>
          </button>
        </form>
      </div>

      {/* ३. शेवटची पावती ॲलर्ट */}
      {lastReceipt && (
        <div className="no-print" style={successBanner}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>✅</span>
                <span style={{ color: "#065f46", fontWeight: "800", fontSize: "15px" }}>नोंद यशस्वीरीत्या झाली!</span>
              </div>
              <div style={{ fontSize: "13.5px", color: "#047857", marginTop: "4px" }}>
                पावती: <b>#{lastReceipt.id}</b> • शेतकरी: <b>{lastReceipt.farmer_name} [{lastReceipt.farmer_code}]</b> • लिटर: <b>{lastReceipt.quantity} L</b> • रक्कम: <b>₹ {lastReceipt.total_amount}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => sendWhatsAppReceipt(lastReceipt)} style={btnWhatsAppModern}>
                <span>📲</span> WhatsApp पावती पाठवा
              </button>
              <button onClick={() => handlePrintEntry(lastReceipt)} style={btnPrintModern}>
                <span>🖨️</span> पावती प्रिंट
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ४. आजच्या नोंदी टेबल */}
      <div className="no-print" style={tableCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h4 style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: "800" }}>
              📋 {shift === "MORNING" ? "☀️ सकाळच्या नोंदी" : "🌙 संध्याकाळच्या नोंदी"} ({entryDate})
            </h4>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12px" }}>
              वर निवडलेल्या शिफ्टनुसार फिल्टर केलेला डेटा (एकूण: {selectedShiftEntries.length} नोंदी)
            </p>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              type="button" 
              onClick={() => setShift("MORNING")}
              style={shift === "MORNING" ? filterBtnActive : filterBtnInactive}
            >
              ☀️ सकाळ ({morningEntries.length})
            </button>
            <button 
              type="button" 
              onClick={() => setShift("EVENING")}
              style={shift === "EVENING" ? filterBtnActive : filterBtnInactive}
            >
              🌙 संध्याकाळ ({eveningEntries.length})
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                <th style={thStyle}>कोड</th>
                <th style={thStyle}>नाव</th>
                <th style={thStyle}>प्रकार</th>
                <th style={thStyle}>लिटर</th>
                <th style={thStyle}>FAT</th>
                <th style={thStyle}>दर</th>
                <th style={thStyle}>रक्कम</th>
                <th style={{ ...thStyle, textAlign: "center" }}>कृती (Action)</th>
              </tr>
            </thead>
            <tbody>
              {selectedShiftEntries.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}><span style={farmerCodeBadge}>{r.farmer_code}</span></td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#0f172a" }}>{r.farmer_name}</td>
                  <td style={tdStyle}>
                    <span style={r.milk_type === "COW" ? cowBadge : buffBadge}>
                      {r.milk_type === "COW" ? "गाय" : "म्हैस"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: "700" }}>{r.quantity} L</td>
                  <td style={tdStyle}>{r.fat}%</td>
                  <td style={tdStyle}>₹ {r.rate}</td>
                  <td style={{ ...tdStyle, fontWeight: "800", color: "#15803d" }}>₹ {r.total_amount}</td>
                  <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => sendWhatsAppReceipt(r)} style={btnSmallWA} title="WhatsApp पावती पाठवा">
                      📲 पाठवा
                    </button>
                    <button onClick={() => handlePrintEntry(r)} style={btnSmallPrint} title="पावती प्रिंट करा">
                      🖨️ प्रिंट
                    </button>
                  </td>
                </tr>
              ))}
              {selectedShiftEntries.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                    या शिफ्टमध्ये ({shift === "MORNING" ? "सकाळ" : "संध्याकाळ"}) अद्याप कोणतीही नोंद झालेली नाही.
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
  letterSpacing: "0.2px",
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

const formCard = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
  marginBottom: "22px",
};

const headerIconBadge = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  background: "#eff6ff",
  color: "#2563eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
};

const uiLabel = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12.5px",
  fontWeight: "700",
  color: "#334155",
};

const modernInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1.5px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "600",
  boxSizing: "border-box",
  outline: "none",
};

const modernSelect = {
  ...modernInput,
  cursor: "pointer",
};

const readonlyInput = {
  ...modernInput,
  background: "#f1f5f9",
  color: "#334155",
  fontWeight: "700",
  cursor: "not-allowed",
  border: "1.5px dashed #cbd5e1",
};

const rateBadge = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#eff6ff",
  border: "1.5px solid #bfdbfe",
  color: "#1d4ed8",
  fontSize: "15.5px",
  fontWeight: "800",
  textAlign: "center",
  boxSizing: "border-box",
};

const amountBadge = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#f0fdf4",
  border: "1.5px solid #bbf7d0",
  color: "#15803d",
  fontSize: "16px",
  fontWeight: "900",
  textAlign: "center",
  boxSizing: "border-box",
};

const btnSubmitModern = {
  width: "100%",
  padding: "13px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  fontWeight: "800",
  fontSize: "15px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
};

const successBanner = {
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  padding: "16px 20px",
  borderRadius: "12px",
  marginBottom: "22px",
  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.1)",
};

const btnWhatsAppModern = {
  padding: "9px 18px",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
};

const btnPrintModern = {
  padding: "9px 18px",
  background: "#0f172a",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
};

const tableCard = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
};

const filterBtnActive = {
  padding: "6px 14px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "700",
  fontSize: "12px",
  cursor: "pointer",
};

const filterBtnInactive = {
  padding: "6px 14px",
  background: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "12px",
  cursor: "pointer",
};

const thStyle = {
  padding: "12px 14px",
  fontWeight: "700",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "14px",
  verticalAlign: "middle",
  color: "#334155",
};

const farmerCodeBadge = {
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

const btnSmallWA = {
  padding: "5px 10px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "11.5px",
  fontWeight: "700",
  cursor: "pointer",
};

const btnSmallPrint = {
  padding: "5px 10px",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "11.5px",
  fontWeight: "700",
  cursor: "pointer",
  marginLeft: "6px",
};