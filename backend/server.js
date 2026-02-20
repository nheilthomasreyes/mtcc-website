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

const generateServiceRequestFormName = (dateRequested, roa, ts, yearlySequence) => {
  if (!dateRequested || (!roa && !ts)) return null;
  
  const date = new Date(dateRequested);
  // Month and Year are kept separate
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const type = roa ? 'ROA' : 'TS';
  
  // Removed the "/" between month and year
  return `${month}${year}-Material-Testing-Service-Request-Form_${type}#${yearlySequence}`;
};


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
// GET all clients - Numbers adjust automatically based on dateRequested
app.get("/clients", (req, res) => {
// We query the VIEW instead of the TABLE
  const query = "SELECT * FROM client_list_view ORDER BY dateRequested ASC";
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(results);
  });
});

// POST create new client - CORRECTED TO MATCH DATABASE SCHEMA
app.post("/clients", (req, res) => {
  console.log("=== RECEIVED CLIENT DATA ===");
  console.log("sampleNo1:", req.body.sampleNo1, "Type:", typeof req.body.sampleNo1);
  console.log("sampleNo2:", req.body.sampleNo2, "Type:", typeof req.body.sampleNo2);
  console.log("company:", req.body.company);
  console.log("roa:", req.body.roa);
  console.log("ts:", req.body.ts);
  console.log("Full body:", req.body);
  console.log("============================");
  
  const { 
    name, address, email, phone, category, serviceType, 
    status, progress, dateRequested, startDate, dueDate, 
    dateClaimed, dateReleased, requestForm, testDate, 
    releasedROA, roa, ts, roaV, sampleNo1, sampleNo2, specimenNo, sampleCount,
    amount, officialReceipt, remarks, testTypes, company
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
  const type = roa ? 'ROA' : (ts ? 'TS' : null);
  let serviceRequestForm = null;
  
  if (type) {
    // Get count of same type in same year
    const typeCountQuery = `
      SELECT COUNT(*) as count FROM clients 
      WHERE YEAR(dateRequested) = ? AND ${type === 'ROA' ? 'roa = 1' : 'ts = 1'}
    `;
    
    db.query(typeCountQuery, [year], (typeErr, typeResult) => {
      if (typeErr) {
        console.error("Error counting type:", typeErr);
        return res.status(500).json({ message: "Server error generating service request form" });
      }

      const sequenceNumber = typeResult[0].count + 1;
      serviceRequestForm = generateServiceRequestFormName(dateRequested, roa, ts, sequenceNumber);

      // Now insert with the generated serviceRequestForm
      insertClient(serviceRequestForm);
    });
  } else {
    // No type selected, insert without serviceRequestForm
    insertClient(ull);
  }

  function insertClient(serviceRequestForm) {
  // INSERT query matching ACTUAL database columns
    const query = `
      INSERT INTO clients
      (serviceRequestForm, name, address, email, phone, category, 
      serviceType, status, progress, dateRequested, startDate, dueDate, 
      dateClaimed, dateReleased, requestForm, testDate, releasedROA, roa, ts, roaV, 
      sampleNo1, sampleNo2, sampleCount, amount, officialReceipt, remarks, testTypes, 
      specimenNo, company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      serviceRequestForm,                     // serviceRequestID
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
      releasedROA || null,
      roa ? 1 : 0,
      ts ? 1 : 0,                    // releasedROA
      roaV ? 1 : 0,                           // roaV (boolean to 0/1)
      sampleNo1 || null,                       // sampleNo1
      sampleNo2 || null,                      // sampleNo2
      sampleCount || 0,                       // sampleCount
      amount || 0,                            // amount
      officialReceipt ? 1 : 0,               // officialReceipt (boolean to 0/1)
      remarks || null,                        // remarks
      testTypes || null,                      // testTypes (already string from frontend)
      specimenNo || null,                     // specimenNo
      company || null                         // company
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
        serviceRequestForm: serviceRequestForm
      });
    });
  };
});

// PUT update client - CORRECTED TO MATCH DATABASE SCHEMA
app.put("/clients/:id", (req, res) => {
  const { id } = req.params;

  const { 
    serviceRequestForm, name, address, email, phone, 
    category, serviceType, status, progress, dateRequested, 
    startDate, dueDate, dateClaimed, dateReleased, requestForm, 
    testDate, releasedROA, roa, ts, roaV, sampleNo1, sampleNo2, specimenNo, sampleCount,
    amount, officialReceipt, remarks, testTypes, company
  } = req.body;
  const year = new Date(dateRequested).getFullYear();
  const type = roa ? 'ROA' : (ts ? 'TS' : null);
  
  if (type) {
    // Get the current client's data to determine its sequence
    const getCurrentQuery = 'SELECT roa, ts, dateRequested FROM clients WHERE id = ?';
    
    db.query(getCurrentQuery, [id], (getCurrentErr, currentResult) => {
      if (getCurrentErr) {
        console.error("Error getting current client:", getCurrentErr);
        return res.status(500).json({ message: "Server error" });
      }

      const currentClient = currentResult[0];
      const typeChanged = (roa && !currentClient.roa) || (ts && !currentClient.ts);

      if (typeChanged) {
        // Type changed, need to recalculate sequence
        const typeCountQuery = `
          SELECT COUNT(*) as count FROM clients 
          WHERE YEAR(dateRequested) = ? AND ${type === 'ROA' ? 'roa = 1' : 'ts = 1'}
        `;
        
        db.query(typeCountQuery, [year], (typeErr, typeResult) => {
          if (typeErr) {
            console.error("Error counting type:", typeErr);
            return res.status(500).json({ message: "Server error" });
          }

          const sequenceNumber = typeResult[0].count + 1;
          const serviceRequestForm = generateServiceRequestFormName(dateRequested, roa, ts, sequenceNumber);
          updateClient(serviceRequestForm);
        });
      } else {
        // Type didn't change, keep existing serviceRequestForm or regenerate if needed
        const serviceRequestForm = generateServiceRequestFormName(dateRequested, roa, ts, 1);
        updateClient(serviceRequestForm);
      }
    });
  } else {
    updateClient(null);
  }

  function updateClient(serviceRequestForm) {
    const query = `
      UPDATE clients 
      SET serviceRequestForm = ?, name = ?, address = ?, email = ?, 
          phone = ?, category = ?, serviceType = ?, status = ?, progress = ?,
          dateRequested = ?, startDate = ?, dueDate = ?, dateClaimed = ?, 
          dateReleased = ?, requestForm = ?, testDate = ?, releasedROA = ?, roa = ?, ts = ?, 
          roaV = ?, sampleNo1 = ?, sampleNo2 = ?, sampleCount = ?, amount = ?, 
          officialReceipt = ?, remarks = ?, testTypes = ?, specimenNo = ?,
          company = ?
      WHERE id = ?
    `;

    const values = [
      serviceRequestForm,
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
      ts ? 1 : 0,
      roaV ? 1 : 0,
      sampleNo1 || null,
      sampleNo2 || null,
      sampleCount || 0,
      amount || 0,
      officialReceipt ? 1 : 0,
      remarks || null,
      testTypes || null,
      specimenNo || null,
      company || null,
      id
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
      }
      res.json({ message: "Client updated successfully", serviceRequestForm: serviceRequestForm });
    });
  }
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
  console.log(`Server running on http://192.168.103.84:${PORT}`);
});