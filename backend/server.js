// backend/server.js
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database successfully!");
});

// Test GET route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// LOGIN ROUTE
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  console.log("=== LOGIN ATTEMPT ===");
  console.log("Received email:", email);
  console.log("Received password:", password);

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    console.log("Query results:", results);
    console.log("Number of results:", results.length);

    if (results.length > 0) {
      console.log("✓ Login successful!");
      res.json({ 
        message: "Login successful",
        user: { email: results[0].email, id: results[0].id }
      });
    } else {
      console.log("✗ Login failed - no matching user found");
      res.status(401).json({ message: "Invalid credentials" });
    }
  });
});


app.get("/categories", (req, res) => {
  const query = "SELECT * FROM institution ORDER BY company ASC";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error fetching categories:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(results);
  });
});

// POST create new category
app.post("/categories", (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: "Category name is required" });
  }

  const query = "INSERT INTO institution (company, created_at) VALUES (?, NOW())";
  db.query(query, [name.trim()], (err, result) => {
    if (err) {
      console.error("Database error inserting category:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json({ message: "Category added successfully", id: result.insertId, name: name.trim() });
  });
});


// GET all clients
app.get("/clients", (req, res) => {
  const query = "SELECT * FROM clients ORDER BY dateRequested DESC";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(results);
  });
});

// POST create new client - CORRECTED TO MATCH DATABASE SCHEMA
app.post("/clients", (req, res) => {
  const { 
    name, address, email, phone, category, serviceType, 
    status, progress, dateRequested, startDate, dueDate, 
    dateClaimed, dateReleased, requestForm, testDate, 
    releasedROA, roa, sampleNo, specimenNo, sampleCount,
    amount, officialReceipt, remarks, testTypes
  } = req.body;

  // Validation
  if (!dateRequested) {
    return res.status(400).json({ message: "dateRequested is required" });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: "name is required" });
  }

  const parsedDateRequested = new Date(dateRequested);
  if (isNaN(parsedDateRequested.getTime())) {
    return res.status(400).json({ message: "Invalid dateRequested" });
  }

  // Generate serviceNo (example: 2026-0001)
  const year = new Date(dateRequested).getFullYear();
  const countQuery = 'SELECT COUNT(*) as count FROM clients WHERE YEAR(dateRequested) = ?';
  
  db.query(countQuery, [year], (countErr, countResult) => {
    if (countErr) {
      console.error("Error counting clients:", countErr);
      return res.status(500).json({ message: "Server error generating service number" });
    }

    const nextNumber = (countResult[0].count + 1).toString().padStart(4, '0');
    const serviceNo = `${year}-${nextNumber}`;
    const serviceRequestID = `SRQ-${year}-${nextNumber}`;

    // INSERT query matching ACTUAL database columns
    const query = `
      INSERT INTO clients 
      (serviceNo, serviceRequestID, name, address, email, phone, category, 
       serviceType, status, progress, dateRequested, startDate, dueDate, 
       dateClaimed, dateReleased, requestForm, testDate, releasedROA, roa, 
       sampleNo, sampleCount, amount, officialReceipt, remarks, testTypes, specimenNo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      serviceNo,                              // serviceNo
      serviceRequestID,                       // serviceRequestID
      name,                                   // name
      address || null,                        // address
      email || null,                          // email
      phone || null,                          // phone
      category || 'Industry',                 // category
      serviceType || 'Material Testing',      // serviceType
      status || 'Pending',                    // status
      progress || 0,                          // progress
      dateRequested,                          // dateRequested
      startDate || null,                      // startDate
      dueDate || null,                        // dueDate
      dateClaimed || null,                    // dateClaimed
      dateReleased || null,                   // dateReleased
      requestForm || 'Waiting',               // requestForm
      testDate || null,                       // testDate
      releasedROA || null,                    // releasedROA
      roa ? 1 : 0,                           // roa (boolean to 0/1)
      sampleNo || null,                       // sampleNo
      sampleCount || 0,                       // sampleCount
      amount || 0,                            // amount
      officialReceipt ? 1 : 0,               // officialReceipt (boolean to 0/1)
      remarks || null,                        // remarks
      testTypes || null,                      // testTypes (already string from frontend)
      specimenNo || null,                     // specimenNo
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        console.error("Query:", query);
        console.error("Values:", values);
        return res.status(500).json({ 
          message: "Server error", 
          error: err.message,
          details: "Check if all database columns exist"
        });
      }
      res.json({ 
        message: "Client added successfully", 
        id: result.insertId,
        serviceNo: serviceNo,
        serviceRequestID: serviceRequestID
      });
    });
  });
});

// PUT update client - CORRECTED TO MATCH DATABASE SCHEMA
app.put("/clients/:id", (req, res) => {
  const { id } = req.params;

  const { 
    serviceNo, serviceRequestID, name, address, email, phone, 
    category, serviceType, status, progress, dateRequested, 
    startDate, dueDate, dateClaimed, dateReleased, requestForm, 
    testDate, releasedROA, roa, sampleNo, specimenNo, sampleCount,
    amount, officialReceipt, remarks, testTypes
  } = req.body;

  const query = `
    UPDATE clients 
    SET serviceNo = ?, serviceRequestID = ?, name = ?, address = ?, email = ?, 
        phone = ?, category = ?, serviceType = ?, status = ?, progress = ?,
        dateRequested = ?, startDate = ?, dueDate = ?, dateClaimed = ?, 
        dateReleased = ?, requestForm = ?, testDate = ?, releasedROA = ?, 
        roa = ?, sampleNo = ?, sampleCount = ?, amount = ?, 
        officialReceipt = ?, remarks = ?, testTypes = ?, specimenNo = ?
    WHERE id = ?
  `;

  const values = [
    serviceNo || null,
    serviceRequestID || null,
    name,
    address || null,
    email || null,
    phone || null,
    category || 'Industry',
    serviceType || 'Material Testing',
    status || 'Pending',
    progress || 0,
    dateRequested,
    startDate || null,
    dueDate || null,
    dateClaimed || null,
    dateReleased || null,
    requestForm || 'Waiting',
    testDate || null,
    releasedROA || null,
    roa ? 1 : 0,
    sampleNo || null,
    sampleCount || 0,
    amount || 0,
    officialReceipt ? 1 : 0,
    remarks || null,
    testTypes || null,
    specimenNo || null,
    id
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
    res.json({ message: "Client updated successfully" });
  });
});

// DELETE client
app.delete("/clients/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM clients WHERE id = ?";
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json({ message: "Client deleted successfully" });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});