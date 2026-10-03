require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const ExcelJS = require("exceljs");

const app = express();
app.use(cors());
app.use(express.json());

// TiDB Cloud MySQL Connection Pool
const db = mysql.createPool({
  host: process.env.TIDB_HOST || "localhost",
  port: Number(process.env.TIDB_PORT) || 4000,
  user: process.env.TIDB_USER || "root",
  password: process.env.TIDB_PASSWORD || "",
  database: process.env.TIDB_DATABASE || "dairy_db",
  dateStrings: true,
  timezone: "+05:30",
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// टेस्ट कनेक्शन
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ TiDB क्लाउड डेटाबेस कनेक्शन एरर:", err.message);
  } else {
    console.log("✅ TiDB Cloud Database Connected Successfully!");
    connection.release();
  }
});

// ==========================================
// १. ऑथेंटिकेशन / लॉगिन API
// ==========================================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `
    SELECT u.id AS user_id, u.username, u.role, u.dairy_id, u.status AS user_status,
           d.dairy_name, d.dairy_code, d.owner_name, d.phone, d.address, d.status AS dairy_status
    FROM users u
    LEFT JOIN dairies d ON u.dairy_id = d.id
    WHERE u.username = ? AND u.password = ?
  `;

  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ error: "चुकीचे युझरनेम किंवा पासवर्ड!" });
    }

    const user = results[0];

    // ब्लॉक तपासणी
    if (user.user_status === "BLOCKED" || (user.role === "DAIRY_USER" && user.dairy_status === "BLOCKED")) {
      return res.status(403).json({
        error: "हे डेअरी खाते निष्क्रिय/ब्लॉक केले गेले आहे. कृपया सुपर ॲडमिनशी संपर्क साधा.",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        dairy_id: user.dairy_id,
        dairy_name: user.dairy_name || "मास्टर सुपर ॲडमिन पॅनल",
        dairy_code: user.dairy_code,
        owner_name: user.owner_name,
        phone: user.phone,
        address: user.address,
      },
    });
  });
});

// ==========================================
// २. सुपर ॲडमिन APIs (Multi-Dairy Management)
// ==========================================

// सर्व डेअरींची यादी
app.get("/api/admin/dairies", (req, res) => {
  const sql = `
    SELECT 
      d.id, 
      d.dairy_code, 
      d.dairy_name, 
      d.owner_name, 
      d.phone, 
      d.address, 
      d.status, 
      d.created_at,
      u.username,
      (SELECT COUNT(*) FROM farmers WHERE dairy_id = d.id) AS total_farmers,
      (SELECT COUNT(*) FROM milk_collections WHERE dairy_id = d.id) AS total_collections
    FROM dairies d
    LEFT JOIN users u ON u.dairy_id = d.id AND u.role = 'DAIRY_USER'
    ORDER BY d.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// नवीन डेअरी + युझर तयार करणे
app.post("/api/admin/create-dairy", (req, res) => {
  const { dairy_code, dairy_name, owner_name, phone, address, username, password } = req.body;

  if (!dairy_code || !dairy_name || !owner_name || !username || !password) {
    return res.status(400).json({ error: "सर्व आवश्यक माहिती भरणे अनिवार्य आहे!" });
  }

  const dairySql = `
    INSERT INTO dairies (dairy_code, dairy_name, owner_name, phone, address, status)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE')
  `;

  db.query(
    dairySql,
    [dairy_code.trim(), dairy_name.trim(), owner_name.trim(), phone || "", address || ""],
    (err, dairyRes) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "हा डेअरी कोड आधीच अस्तित्वात आहे!" });
        }
        return res.status(500).json({ error: err.message });
      }

      const newDairyId = dairyRes.insertId;

      // नवीन डेअरीसाठी डिफॉल्ट दरपत्रक
      const rateSql = `
        INSERT INTO rate_settings (dairy_id, cow_base_rate, cow_base_fat, cow_fat_rate, cow_snf_rate, buff_base_rate, buff_base_fat, buff_fat_rate, buff_snf_rate)
        VALUES (?, 25.0, 3.5, 4.5, 2.0, 45.0, 6.0, 5.5, 2.5)
        ON DUPLICATE KEY UPDATE dairy_id = dairy_id
      `;
      db.query(rateSql, [newDairyId], () => {});

      const userSql = `
        INSERT INTO users (dairy_id, username, password, role, status)
        VALUES (?, ?, ?, 'DAIRY_USER', 'ACTIVE')
      `;

      db.query(userSql, [newDairyId, username.trim(), password.trim()], (uErr) => {
        if (uErr) {
          if (uErr.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "हे युझरनेम आधीच वापरले गेले आहे!" });
          }
          return res.status(500).json({ error: uErr.message });
        }
        res.json({ success: true, message: "नवीन डेअरी व लॉगिन खाते यशस्वीरीत्या तयार केले!" });
      });
    }
  );
});
// सुपर ॲडमिनसाठी संपूर्ण SaaS आकडेवारी (Analytics Summary)
app.get("/api/admin/stats", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM dairies) AS total_dairies,
      (SELECT COUNT(*) FROM dairies WHERE status = 'ACTIVE') AS active_dairies,
      (SELECT COUNT(*) FROM farmers) AS total_farmers,
      (SELECT IFNULL(SUM(quantity), 0) FROM milk_collections WHERE entry_date = ?) AS today_liters,
      (SELECT IFNULL(SUM(total_amount), 0) FROM milk_collections WHERE entry_date = ?) AS today_amount
  `;

  db.query(sql, [today, today], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// सुपर ॲडमिनद्वारे डेअरी प्रोफाईल अपडेट करणे (अथॉरिटी कंट्रोल)
app.put("/api/admin/dairies/:id", (req, res) => {
  const { id } = req.params;
  const { dairy_name, owner_name, phone, address } = req.body;

  const sql = `
    UPDATE dairies 
    SET dairy_name = ?, owner_name = ?, phone = ?, address = ? 
    WHERE id = ?
  `;

  db.query(sql, [dairy_name, owner_name, phone, address, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "डेअरी माहिती सुपर ॲडमिनद्वारे अपडेट झाली!" });
  });
});

// डेअरी ब्लॉक किंवा ॲक्टिव्ह करणे
app.post("/api/admin/toggle-status", (req, res) => {
  const { dairy_id, status } = req.body; // status: 'ACTIVE' किंवा 'BLOCKED'
  const sql = "UPDATE dairies SET status = ? WHERE id = ?";
  db.query(sql, [status, dairy_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query("UPDATE users SET status = ? WHERE dairy_id = ?", [status, dairy_id], () => {});
    res.json({ success: true, message: `डेअरी स्थिती आता '${status}' करण्यात आली आहे!` });
  });
});

// ==========================================
// ३. शेतकरी API (dairy_id व farmer_code नुसार)
// ==========================================
app.get("/api/farmers", (req, res) => {
  const dairyId = req.query.dairy_id || 1;
  const farmerCode = req.query.farmer_code;

  let sql = "SELECT * FROM farmers WHERE dairy_id = ?";
  const params = [dairyId];

  if (farmerCode && farmerCode.trim() !== "") {
    sql += " AND farmer_code = ?";
    params.push(farmerCode.trim());
  } else {
    sql += " ORDER BY id DESC";
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.put("/api/farmers/:id", (req, res) => {
  const { id } = req.params;
  const { farmer_code, full_name, milk_type, phone } = req.body;

  // सिंटॅक्स एरर दुरुस्त: स्वल्पविराम काढला
  const sql = `UPDATE farmers SET farmer_code = ?, full_name = ?, milk_type = ?, phone = ?, updated_at = NOW() WHERE id = ?`;
  db.query(sql, [farmer_code, full_name, milk_type, phone, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "शेतकरी माहिती यशस्वीरीत्या अपडेट झाली!" });
  });
});

app.post("/api/farmers", (req, res) => {
  const { farmer_code, full_name, milk_type, phone, dairy_id } = req.body;
  const sql = `
    INSERT INTO farmers (farmer_code, full_name, milk_type, phone, dairy_id) 
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), milk_type = VALUES(milk_type), phone = VALUES(phone)
  `;
  db.query(
    sql,
    [farmer_code, full_name, milk_type, phone, dairy_id || 1],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

// ==========================================
// ३.१ दरपत्रक (Rate Settings) API
// ==========================================
app.get("/api/rate-settings", (req, res) => {
  const dairyId = req.query.dairy_id || 1;
  const sql = "SELECT * FROM rate_settings WHERE dairy_id = ? LIMIT 1";

  db.query(sql, [dairyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.json({
        cow_base_rate: 25.0,
        cow_base_fat: 3.5,
        cow_fat_rate: 4.5,
        cow_snf_rate: 2.0,
        buff_base_rate: 45.0,
        buff_base_fat: 6.0,
        buff_fat_rate: 5.5,
        buff_snf_rate: 2.5,
      });
    }
    res.json(results[0]);
  });
});

app.post("/api/rate-settings", (req, res) => {
  const {
    dairy_id = 1,
    cow_base_rate,
    cow_base_fat,
    cow_fat_rate,
    cow_snf_rate,
    buff_base_rate,
    buff_base_fat,
    buff_fat_rate,
    buff_snf_rate,
  } = req.body;

  const sql = `
    INSERT INTO rate_settings 
      (dairy_id, cow_base_rate, cow_base_fat, cow_fat_rate, cow_snf_rate, buff_base_rate, buff_base_fat, buff_fat_rate, buff_snf_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      cow_base_rate = VALUES(cow_base_rate),
      cow_base_fat = VALUES(cow_base_fat),
      cow_fat_rate = VALUES(cow_fat_rate),
      cow_snf_rate = VALUES(cow_snf_rate),
      buff_base_rate = VALUES(buff_base_rate),
      buff_base_fat = VALUES(buff_base_fat),
      buff_fat_rate = VALUES(buff_fat_rate),
      buff_snf_rate = VALUES(buff_snf_rate)
  `;

  db.query(
    sql,
    [
      dairy_id,
      cow_base_rate,
      cow_base_fat,
      cow_fat_rate,
      cow_snf_rate,
      buff_base_rate,
      buff_base_fat,
      buff_fat_rate,
      buff_snf_rate,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "दरपत्रक यशस्वीरीत्या सेव्ह झाले!" });
    }
  );
});

// ==========================================
// ४. दूध संकलन API
// ==========================================
const saveMilkCollection = (req, res) => {
  const {
    entry_date,
    entry_time,
    shift,
    farmer_code,
    farmer_name,
    milk_type,
    quantity,
    fat,
    snf,
    rate,
    total_amount,
    dairy_id,
  } = req.body;

  const currentTime = entry_time || new Date().toTimeString().split(" ")[0];

  const sql = `
    INSERT INTO milk_collections 
    (entry_date, entry_time, shift, farmer_code, farmer_name, milk_type, quantity, fat, snf, rate, total_amount, dairy_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      entry_date,
      currentTime,
      shift,
      farmer_code,
      farmer_name,
      milk_type,
      quantity,
      fat || 0,
      snf || 0,
      rate,
      total_amount,
      dairy_id || 1,
    ],
    (err, result) => {
      if (err) {
        console.error("दूध नोंदणी एरर:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: result.insertId });
    }
  );
};

app.post("/api/collections", saveMilkCollection);
app.post("/api/milk-collections", saveMilkCollection);

app.get("/api/collections/recent", (req, res) => {
  const { dairy_id = 1, date, shift } = req.query;
  let sql = `
    SELECT id, DATE_FORMAT(entry_date, '%Y-%m-%d') AS entry_date, 
           entry_time, shift, farmer_code, farmer_name, milk_type, 
           quantity, fat, snf, rate, total_amount 
    FROM milk_collections 
    WHERE dairy_id = ?
  `;
  const params = [dairy_id];

  if (date) {
    sql += " AND entry_date = ?";
    params.push(date);
  }
  if (shift) {
    sql += " AND shift = ?";
    params.push(shift);
  }

  sql += " ORDER BY id DESC LIMIT 50";

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/api/milk-collections", (req, res) => {
  const dairyId = req.query.dairy_id || 1;
  const sql =
    "SELECT *, DATE_FORMAT(entry_date, '%Y-%m-%d') AS entry_date FROM milk_collections WHERE dairy_id = ? ORDER BY id DESC LIMIT 50";
  db.query(sql, [dairyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ==========================================
// ५. १० दिवसांचे बिलिंग API
// ==========================================
app.get("/api/billing-report", (req, res) => {
  const { farmer_code, start_date, end_date, dairy_id } = req.query;

  let sql = `
    SELECT 
      id, 
      DATE_FORMAT(entry_date, '%Y-%m-%d') AS entry_date,
      entry_time, 
      shift, 
      farmer_code, 
      farmer_name, 
      milk_type, 
      quantity, 
      fat, 
      snf, 
      rate, 
      total_amount, 
      dairy_id
    FROM milk_collections 
    WHERE dairy_id = ? AND entry_date BETWEEN ? AND ?
  `;
  const params = [dairy_id || 1, start_date, end_date];

  if (farmer_code && farmer_code.trim() !== "") {
    sql += " AND farmer_code = ?";
    params.push(farmer_code.trim());
  }

  sql += " ORDER BY entry_date ASC, id ASC";

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ==========================================
// ६. उचल व खर्च (Advances) API
// ==========================================
app.post("/api/advances", (req, res) => {
  const { dairy_id, farmer_code, farmer_name, advance_date, amount, reason } = req.body;
  const sql = `
    INSERT INTO advances (dairy_id, farmer_code, farmer_name, advance_date, amount, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
  `;
  db.query(
    sql,
    [dairy_id || 1, farmer_code, farmer_name, advance_date, amount, reason || "उचल"],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "उचल यशस्वीरीत्या नोंदवली!", id: result.insertId });
    }
  );
});

app.get("/api/advances", (req, res) => {
  const dairyId = req.query.dairy_id || 1;
  const sql = `
    SELECT id, DATE_FORMAT(advance_date, '%Y-%m-%d') AS advance_date,
           farmer_code, farmer_name, amount, reason, status
    FROM advances
    WHERE dairy_id = ?
    ORDER BY id DESC LIMIT 50
  `;
  db.query(sql, [dairyId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/api/advances/pending", (req, res) => {
  const { dairy_id, farmer_code } = req.query;
  const sql = `
    SELECT IFNULL(SUM(amount), 0) AS total_advance
    FROM advances
    WHERE dairy_id = ? AND farmer_code = ? AND status = 'PENDING'
  `;
  db.query(sql, [dairy_id || 1, farmer_code], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ total_advance: results[0].total_advance });
  });
});

app.post("/api/advances/deduct", (req, res) => {
  const { dairy_id, farmer_code } = req.body;

  if (!farmer_code) {
    return res.status(400).json({ error: "शेतकरी कोड आवश्यक आहे!" });
  }

  const sql = `
    UPDATE advances 
    SET status = 'DEDUCTED' 
    WHERE dairy_id = ? AND farmer_code = ? AND status = 'PENDING'
  `;

  db.query(sql, [dairy_id || 1, farmer_code], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      message: "उचल कपात यशस्वीरीत्या पूर्ण झाली!",
      affectedRows: result.affectedRows,
    });
  });
});

// ==========================================
// ७. Excel बॅकअप API
// ==========================================
app.get("/api/backup", async (req, res) => {
  const dairyId = req.query.dairy_id || 1;

  try {
    const p1 = new Promise((resolve, reject) => {
      db.query(
        "SELECT id, farmer_code, full_name, milk_type, phone, DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at FROM farmers WHERE dairy_id = ?",
        [dairyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const p2 = new Promise((resolve, reject) => {
      db.query(
        "SELECT id, DATE_FORMAT(entry_date, '%Y-%m-%d') AS entry_date, entry_time, shift, farmer_code, farmer_name, milk_type, quantity, fat, snf, rate, total_amount FROM milk_collections WHERE dairy_id = ? ORDER BY id DESC",
        [dairyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const p3 = new Promise((resolve, reject) => {
      db.query(
        "SELECT id, DATE_FORMAT(advance_date, '%Y-%m-%d') AS advance_date, farmer_code, farmer_name, amount, reason, status FROM advances WHERE dairy_id = ? ORDER BY id DESC",
        [dairyId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const [farmers, collections, advances] = await Promise.all([p1, p2, p3]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Dairy Management SaaS";

    const sheetCollections = workbook.addWorksheet("दूध संकलन");
    sheetCollections.columns = [
      { header: "अ.क्र.", key: "id", width: 10 },
      { header: "दिनांक", key: "entry_date", width: 14 },
      { header: "वेळ", key: "entry_time", width: 14 },
      { header: "शिफ्ट", key: "shift", width: 12 },
      { header: "शेतकरी कोड", key: "farmer_code", width: 14 },
      { header: "शेतकऱ्याचे नाव", key: "farmer_name", width: 22 },
      { header: "प्रकार", key: "milk_type", width: 10 },
      { header: "लिटर", key: "quantity", width: 12 },
      { header: "FAT", key: "fat", width: 10 },
      { header: "SNF", key: "snf", width: 10 },
      { header: "दर", key: "rate", width: 12 },
      { header: "रक्कम", key: "total_amount", width: 16 },
    ];
    sheetCollections.getRow(1).font = { bold: true };
    collections.forEach((row, index) => {
      sheetCollections.addRow({ ...row, id: index + 1 });
    });

    const sheetFarmers = workbook.addWorksheet("शेतकरी यादी");
    sheetFarmers.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "शेतकरी कोड", key: "farmer_code", width: 14 },
      { header: "शेतकऱ्याचे नाव", key: "full_name", width: 24 },
      { header: "दुधाचा प्रकार", key: "milk_type", width: 14 },
      { header: "मोबाईल नंबर", key: "phone", width: 16 },
      { header: "नोंदणी तारीख", key: "created_at", width: 16 },
    ];
    sheetFarmers.getRow(1).font = { bold: true };
    farmers.forEach((row) => sheetFarmers.addRow(row));

    const sheetAdvances = workbook.addWorksheet("उचल व खर्च");
    sheetAdvances.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "तारीख", key: "advance_date", width: 14 },
      { header: "शेतकरी कोड", key: "farmer_code", width: 14 },
      { header: "शेतकऱ्याचे नाव", key: "farmer_name", width: 22 },
      { header: "रक्कम", key: "amount", width: 14 },
      { header: "तपशील", key: "reason", width: 24 },
      { header: "स्थिती", key: "status", width: 16 },
    ];
    sheetAdvances.getRow(1).font = { bold: true };
    advances.forEach((row) => sheetAdvances.addRow(row));

    const today = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Dairy_Backup_${today}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Backup Excel Error:", err);
    res.status(500).json({ error: "Excel बॅकअप तयार करताना त्रुटी आली!" });
  }
});

// ==========================================
// ८. सर्व्हर स्टार्ट (शेवटी)
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
});
// पासवर्ड बदलणे व रीसेट करणे (सुरक्षित व लवचिक API)
app.post("/api/change-password", async (req, res) => {
  const { username, newPassword, oldPassword, isSuperAdmin } = req.body;

  if (!username || !newPassword) {
    return res.status(400).json({ error: "युझरनेम आणि नवीन पासवर्ड आवश्यक आहेत!" });
  }

  try {
    // १. जर सुपर ॲडमिन नसेल, तर जुना पासवर्ड तपासणे अनिवार्य
    if (!isSuperAdmin) {
      if (!oldPassword) {
        return res.status(400).json({ error: "कृपया जुना पासवर्ड टाका!" });
      }

      const [check] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND password = ?",
        [username, oldPassword]
      );

      if (check.length === 0) {
        return res.status(400).json({ error: "जुना पासवर्ड चुकीचा आहे!" });
      }
    }

    // २. नवीन पासवर्ड अपडेट करणे
    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE username = ?",
      [newPassword, username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "युझर सापडला नाही!" });
    }

    res.json({ message: "पासवर्ड यशस्वीरीत्या अपडेट झाला!" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ error: "सर्व्हर एरर आला!" });
  }
});