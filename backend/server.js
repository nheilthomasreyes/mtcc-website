// backend/server.js
require('dotenv').config(); // ADD THIS AT THE TOP!

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug: Check if .env is loaded (you can remove this later)
console.log("Connecting to database with:");
console.log("Host:", process.env.DB_HOST);
console.log("User:", process.env.DB_USER);
console.log("Database:", process.env.DB_NAME);

// MySQL connection - USING .ENV VALUES!
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

  // Query database for user
  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (results.length > 0) {
      // User found - login successful
      res.json({ 
        message: "Login successful",
        user: { email: results[0].email, id: results[0].id }
      });
    } else {
      // Invalid credentials
      res.status(401).json({ message: "Invalid credentials" });
    }
  });
});

// POST route to receive client data
app.post("/clients", (req, res) => {
  console.log("Received client data:", req.body);
  res.json({ message: "Client added successfully", data: req.body });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});