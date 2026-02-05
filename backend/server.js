// backend/server.js
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;

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

// POST create new client
app.post("/clients", (req, res) => {
  const { 
    serviceNo, name, address, email, phone, category, serviceType, 
    status, progress, dateRequested, startDate, dueDate, dateClaimed,
    dateReleased, requestForm, dateOfTest, testTypes, amount, 
    signatories, laboratory, remarks, sampleCount
  } = req.body;

  if (!dateRequested) {
    return res.status(400).json({ message: "dateRequested is required" });
  }

  const parsedDateRequested = new Date(dateRequested);
  if (isNaN(parsedDateRequested.getTime())) {
    return res.status(400).json({ message: "Invalid dateRequested" });
  }

  const roa = parsedDateRequested.toISOString().slice(0,10).replace(/-/g, "");

  const query = `
    INSERT INTO clients 
    (serviceNo, name, address, email, phone, category, serviceType, status, 
     progress, roa, dateRequested, dateReleased, dateClaimed, startDate, dueDate, 
     requestForm, testTypes, amount, signatories, laboratory, remarks, sampleCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    serviceNo, name, address, email, phone, category, serviceType, 
    status, progress, roa, dateRequested, dateReleased, dateClaimed, 
    startDate, dueDate, requestForm, testTypes, amount, 
    signatories, laboratory, remarks, sampleCount
  ], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json({ message: "Client added successfully", id: result.insertId, roa });
  });
});

// PUT update client
// PUT update client
app.put("/clients/:id", (req, res) => {
  const { id } = req.params;

  let { 
    serviceNo, name, address, email, phone, category, serviceType, 
    status, progress, dateRequested, dateReleased, dateClaimed, 
    startDate, dueDate, requestForm, testTypes, amount, 
    signatories, laboratory, remarks, sampleCount 
  } = req.body;

  // Recalculate ROA if dateRequested is present
  let roa = req.body.roa || null;
  if (dateRequested) {
    const parsedDateRequested = new Date(dateRequested);
    if (!isNaN(parsedDateRequested.getTime())) {
      roa = parsedDateRequested.toISOString().slice(0,10).replace(/-/g, "");
    }
  }

  const query = `
    UPDATE clients 
    SET serviceNo = ?, name = ?, address = ?, email = ?, phone = ?, 
        category = ?, serviceType = ?, status = ?, progress = ?, roa = ?,
        dateRequested = ?, dateReleased = ?, dateClaimed = ?, 
        startDate = ?, dueDate = ?, requestForm = ?, testTypes = ?, 
        amount = ?, signatories = ?, laboratory = ?, remarks = ?, sampleCount = ?
    WHERE id = ?
  `;

  db.query(query, [
    serviceNo, name, address, email, phone, category, serviceType, 
    status, progress, roa, dateRequested, dateReleased, dateClaimed, 
    startDate, dueDate, requestForm, testTypes, amount, 
    signatories, laboratory, remarks, sampleCount, id
  ], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json({ message: "Client updated successfully", roa });
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