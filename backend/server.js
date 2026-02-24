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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const type = roa ? 'ROA' : 'TS';

  return `${month}${year}-Material-Testing-Service-Request-Form_${type}#${yearlySequence}`;
};

// ─── Test GET route ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length > 0) {
      res.json({
        message: "Login successful",
        user: { email: results[0].email, id: results[0].id }
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
app.get("/categories", (req, res) => {
  const query = "SELECT * FROM institution ORDER BY company ASC";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(results);
  });
});

app.post("/categories", (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ message: "Category name is required" });
  }

  const query = "INSERT INTO institution (company, created_at) VALUES (?, NOW())";
  db.query(query, [name.trim()], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ message: "Category added successfully", id: result.insertId, name: name.trim() });
  });
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
app.get("/clients", (req, res) => {
  const query = "SELECT * FROM client_list_view ORDER BY dateRequested ASC";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(results);
  });
});

// POST /clients — inserts client + service_tests rows
app.post("/clients", (req, res) => {
  const {
    name, address, email, phone, company,
    category, serviceType, status, progress,
    dateRequested, startDate, dueDate, dateClaimed, dateReleased,
    requestForm, testDate, releasedROA,
    roa, ts, roaV, officialReceipt,
    remarks,
    serviceTests   // array: [{ testType, sampleNo1, sampleNo2, sampleCount, specimenNo, amount }]
  } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!dateRequested) {
    return res.status(400).json({ message: "dateRequested is required" });
  }
  if (!name || name.trim() === '') {
    return res.status(400).json({ message: "name is required" });
  }
  if (isNaN(new Date(dateRequested).getTime())) {
    return res.status(400).json({ message: "Invalid dateRequested" });
  }

  // ── Generate serviceRequestForm ─────────────────────────────────────────────
  const year = new Date(dateRequested).getFullYear();
  const type = roa ? 'ROA' : (ts ? 'TS' : null);

  const doInsert = (serviceRequestForm) => {
    const clientQuery = `
      INSERT INTO clients
        (serviceRequestForm, name, address, email, phone, company,
         category, serviceType, status, progress,
         dateRequested, startDate, dueDate, dateClaimed, dateReleased,
         requestForm, testDate, releasedROA,
         roa, ts, roaV, officialReceipt, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const clientValues = [
      serviceRequestForm,
      name.trim(),
      address   || null,
      email     || null,
      phone     || null,
      company   || null,
      category  || 'Industry',
      serviceType || 'Material Testing',
      status    || 'Pending',
      progress  || 0,
      dateRequested,
      startDate    || null,
      dueDate      || null,
      dateClaimed  || null,
      dateReleased || null,
      requestForm  || 'Waiting',
      testDate     || null,
      releasedROA  || null,
      roa ? 1 : 0,
      ts  ? 1 : 0,
      roaV            ? 1 : 0,
      officialReceipt ? 1 : 0,
      remarks || null,
    ];

    db.query(clientQuery, clientValues, (err, result) => {
      if (err) {
        console.error("Error inserting client:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
      }

      const clientId = result.insertId;

      // ── Insert service_tests rows ───────────────────────────────────────────
      // We process tests if the array exists and has content
      if (serviceTests && Array.isArray(serviceTests) && serviceTests.length > 0) {
        const testQuery = `
          INSERT INTO service_tests
            (service_id, testType, sampleNo1, sampleNo2, sampleCount, specimenNo, amount)
          VALUES ?
        `;

        const testValues = serviceTests.map(t => [
          clientId,        // Links the test to the client we just created
          t.testType,
          t.sampleNo1   || null,
          t.sampleNo2   || null,
          t.sampleCount || 0,
          t.specimenNo  || null,
          t.amount      || 0,
        ]);

        db.query(testQuery, [testValues], (testErr) => {
          if (testErr) {
            console.error("Error inserting service_tests:", testErr);
            // Partial success: Client is saved, but tests failed.
            return res.status(207).json({
              message: "Client added but tests failed",
              id: clientId,
              ...req.body,
              serviceRequestForm
            });
          }

          // Full Success: Return the new ID and the original body so frontend can update state
          res.json({
            message: "Client and tests added successfully",
            id: clientId,
            ...req.body,
            serviceRequestForm
          });
        });
      } else {
        // Success without tests
        res.json({
          message: "Client added successfully",
          id: clientId,
          ...req.body,
          serviceRequestForm
        });
      }
    });
  };

  if (type) {
    const typeCountQuery = `
      SELECT COUNT(*) as count FROM clients
      WHERE YEAR(dateRequested) = ? AND ${type === 'ROA' ? 'roa = 1' : 'ts = 1'}
    `;
    db.query(typeCountQuery, [year], (err, result) => {
      if (err) return res.status(500).json({ message: "Server error generating service request form" });
      const sequenceNumber = result[0].count + 1;
      doInsert(generateServiceRequestFormName(dateRequested, roa, ts, sequenceNumber));
    });
  } else {
    doInsert(null);
  }
});

// ─── SERVICE TESTS ────────────────────────────────────────────────────────────

// GET all service_tests for a client
app.get("/clients", (req, res) => {
  // 1. Fetch all clients from your database view
  db.query("SELECT * FROM client_list_view", (err, clients) => {
    if (err) {
      console.error("Error fetching clients:", err);
      return res.status(500).json({ message: "Server error" });
    }

    // 2. Fetch ALL service tests in one go
    db.query("SELECT * FROM service_tests", (err, allTests) => {
      if (err) {
        console.error("Error fetching tests:", err);
        return res.status(500).json({ message: "Server error" });
      }

      // 3. Combine them: Attach tests to their matching client
      const combinedData = clients.map(client => {
        return {
          ...client,
          // We filter the tests by service_id and attach them as 'serviceTests'
          // This name MUST match what your Frontend uses (serviceTests)
          serviceTests: allTests
            .filter(t => t.service_id === client.id)
            .map(t => ({
              ...t,
              serviceId: t.service_id // Ensuring both naming versions exist for safety
            }))
        };
      });

      res.json(combinedData);
    });
  });
});

// PUT update service_tests for a client
// Replaces all existing service_tests rows for that client
app.put("/clients/:id/service_tests", (req, res) => {
  const { id } = req.params;
  const { serviceTests } = req.body; // Expecting { serviceTests: [...] }

  // 1. Delete existing rows for this specific client
  db.query("DELETE FROM service_tests WHERE service_id = ?", [id], (delErr) => {
    if (delErr) {
      console.error("Error deleting old tests:", delErr);
      return res.status(500).json({ message: "Server error deleting old tests" });
    }

    // 2. If the user cleared all tests, return success immediately
    if (!serviceTests || !Array.isArray(serviceTests) || serviceTests.length === 0) {
      return res.json({ 
        message: "Service tests cleared", 
        service_id: id, 
        serviceTests: [] 
      });
    }

    // 3. Prepare the new rows
    const testQuery = `
      INSERT INTO service_tests
        (service_id, testType, sampleNo1, sampleNo2, sampleCount, specimenNo, amount)
      VALUES ?
    `;

    const testValues = serviceTests.map(t => [
      id,
      t.testType,
      t.sampleNo1   || null,
      t.sampleNo2   || null,
      t.sampleCount || 0,
      t.specimenNo  || null,
      t.amount      || 0,
    ]);

    // 4. Perform the bulk insert
    db.query(testQuery, [testValues], (insertErr) => {
      if (insertErr) {
        console.error("Error inserting service_tests during update:", insertErr);
        return res.status(500).json({ message: "Server error", error: insertErr.message });
      }

      // 5. Return success along with the updated tests
      // This allows the frontend to update the specific client object in the state
      res.json({ 
        message: "Service tests updated successfully",
        service_id: id,
        serviceTests: serviceTests.map(t => ({ ...t, service_id: id }))
      });
    });
  });
});

// ─── PUT /clients/:id — update client only (call PUT service-tests separately) ─
app.put("/clients/:id", (req, res) => {
  const { id } = req.params;
  const {
    name, address, email, phone, company,
    category, serviceType, status, progress,
    dateRequested, startDate, dueDate, dateClaimed, dateReleased,
    requestForm, testDate, releasedROA,
    roa, ts, roaV, officialReceipt, remarks
  } = req.body;

  const year = new Date(dateRequested).getFullYear();
  const type = roa ? 'ROA' : (ts ? 'TS' : null);

  const doUpdate = (serviceRequestForm) => {
    const query = `
      UPDATE clients SET
        serviceRequestForm = ?, name = ?, address = ?, email = ?, phone = ?, company = ?,
        category = ?, serviceType = ?, status = ?, progress = ?,
        dateRequested = ?, startDate = ?, dueDate = ?, dateClaimed = ?, dateReleased = ?,
        requestForm = ?, testDate = ?, releasedROA = ?,
        roa = ?, ts = ?, roaV = ?, officialReceipt = ?, remarks = ?
      WHERE id = ?
    `;

    const values = [
      serviceRequestForm,
      name,
      address      || null,
      email        || null,
      phone        || null,
      company      || null,
      category     || 'Industry',
      serviceType  || 'Material Testing',
      status       || 'Pending',
      progress     || 0,
      dateRequested,
      startDate    || null,
      dueDate      || null,
      dateClaimed  || null,
      dateReleased || null,
      requestForm  || 'Waiting',
      testDate     || null,
      releasedROA  || null,
      roa ? 1 : 0,
      ts  ? 1 : 0,
      roaV            ? 1 : 0,
      officialReceipt ? 1 : 0,
      remarks || null,
      id
    ];

    db.query(query, values, (err) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
      }
      res.json({ message: "Client updated successfully", serviceRequestForm });
    });
  };

  if (type) {
    const getCurrentQuery = "SELECT roa, ts, dateRequested FROM clients WHERE id = ?";
    db.query(getCurrentQuery, [id], (err, currentResult) => {
      if (err) return res.status(500).json({ message: "Server error" });

      const currentClient = currentResult[0];
      const typeChanged = (roa && !currentClient.roa) || (ts && !currentClient.ts);

      if (typeChanged) {
        const typeCountQuery = `
          SELECT COUNT(*) as count FROM clients
          WHERE YEAR(dateRequested) = ? AND ${type === 'ROA' ? 'roa = 1' : 'ts = 1'}
        `;
        db.query(typeCountQuery, [year], (countErr, countResult) => {
          if (countErr) return res.status(500).json({ message: "Server error" });
          const sequenceNumber = countResult[0].count + 1;
          doUpdate(generateServiceRequestFormName(dateRequested, roa, ts, sequenceNumber));
        });
      } else {
        // Re-fetch existing serviceRequestForm to preserve it
        db.query("SELECT serviceRequestForm FROM clients WHERE id = ?", [id], (fetchErr, fetchResult) => {
          if (fetchErr) return res.status(500).json({ message: "Server error" });
          doUpdate(fetchResult[0]?.serviceRequestForm || null);
        });
      }
    });
  } else {
    doUpdate(null);
  }
});

// ─── DELETE client (cascades to service_tests if FK is set, else delete manually) ─
app.delete("/clients/:id", (req, res) => {
  const { id } = req.params;

  // Delete service_tests first in case there's no ON DELETE CASCADE
  db.query("DELETE FROM service_tests WHERE service_id = ?", [id], (delTestErr) => {
    if (delTestErr) {
      console.error("Error deleting service_tests:", delTestErr);
      return res.status(500).json({ message: "Server error deleting service tests" });
    }

    db.query("DELETE FROM clients WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json({ message: "Client deleted successfully" });
    });
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});