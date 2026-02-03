const express = require("express");
const cors = require("cors");
const mysql = require("mysql2"); // MySQL driver

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Connect to MySQL
const db = mysql.createPool({
  host: "localhost",
  user: "your_mysql_user",
  password: "your_mysql_password",
  database: "mtcc_services_db", // your database name
});

// GET all clients
app.get("/clients", (req, res) => {
  db.query("SELECT * FROM clients", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    // Convert testTypes from JSON string to array
    const processed = results.map((c) => ({
      ...c,
      testTypes: JSON.parse(c.testTypes || "[]"),
    }));
    res.json(processed);
  });
});

// POST new client
app.post("/clients", (req, res) => {
  const client = { ...req.body, testTypes: JSON.stringify(req.body.testTypes) };
  const sql = `INSERT INTO clients 
    (name, address, email, phone, category, serviceType, status, progress, dateRequested, dateReleased, dateClaimed, startDate, dueDate, requestForm, testTypes, amount, remarks, serviceNo) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    client.name, client.address, client.email, client.phone,
    client.category, client.serviceType, client.status, client.progress,
    client.dateRequested, client.dateReleased, client.dateClaimed,
    client.startDate, client.dueDate, client.requestForm,
    client.testTypes, client.amount, client.remarks, client.serviceNo
  ];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database insert error" });
    }
    res.json({ message: "Client added successfully", data: { id: results.insertId, ...client } });
  });
});

// PUT and DELETE routes can be added similarly...
