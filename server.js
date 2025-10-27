// Import packages
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");

// Config
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

app.use(cors());
app.use(express.json());
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.log("MySQL connection failed:", err);
  } else {
    console.log("Connected to MySQL Database");
  }
});




app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.query(
    "INSERT INTO users (email, passwordHash) VALUES (?, ?)",
    [email, hashedPassword],
    (err) => {
      if (err) return res.status(500).json({ message: "Error registering user" });
      res.json({ message: "User registered successfully" });
    }
  );
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err || results.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  });
});



app.post("/api/wallets", (req, res) => {
  const { name, userId } = req.body;
  db.query("INSERT INTO wallets (name, userId) VALUES (?, ?)", [name, userId], (err) => {
    if (err) return res.status(500).json({ message: "Error creating wallet" });
    res.json({ message: "Wallet created successfully" });
  });
});

app.get("/api/wallets", (req, res) => {
  db.query("SELECT * FROM wallets", (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching wallets" });
    res.json(results);
  });
});



app.post("/api/transactions", (req, res) => {
  const { walletId, type, amount, category, date, description } = req.body;

  db.query(
    "INSERT INTO transactions (walletId, type, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)",
    [walletId, type, amount, category, date, description],
    (err) => {
      if (err) return res.status(500).json({ message: "Error adding transaction" });

      

      const balanceChange = type === "income" ? amount : -amount;
      db.query(
        "UPDATE wallets SET balance = balance + ? WHERE id = ?",
        [balanceChange, walletId]
      );
      res.json({ message: "Transaction added successfully" });
    }
  );
});

app.get("/api/transactions", (req, res) => {
  db.query("SELECT * FROM transactions", (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching transactions" });
    res.json(results);
  });
});




app.post("/api/budgets", (req, res) => {
  const { userId, category, amount, month } = req.body;
  db.query(
    "INSERT INTO budgets (userId, category, amount, month) VALUES (?, ?, ?, ?)",
    [userId, category, amount, month],
    (err) => {
      if (err) return res.status(500).json({ message: "Error setting budget" });
      res.json({ message: "Budget set successfully" });
    }
  );
});

app.get("/api/budgets", (req, res) => {
  db.query("SELECT * FROM budgets", (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching budgets" });
    res.json(results);
  });
});




app.get("/api/report", (req, res) => {
  const queryIncome = "SELECT SUM(amount) AS totalIncome FROM transactions WHERE type='income'";
  const queryExpense = "SELECT SUM(amount) AS totalExpense FROM transactions WHERE type='expense'";

  db.query(queryIncome, (err, incomeResult) => {
    if (err) return res.status(500).json({ message: "Error fetching income" });
    db.query(queryExpense, (err, expenseResult) => {
      if (err) return res.status(500).json({ message: "Error fetching expenses" });

      const totalIncome = incomeResult[0].totalIncome || 0;
      const totalExpense = expenseResult[0].totalExpense || 0;
      const savings = totalIncome - totalExpense;

      res.json({ totalIncome, totalExpense, savings });
    });
  });
});




app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});