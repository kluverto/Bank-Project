const express = require("express");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 3000;
const bodyparser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();
const { Pool } = require("pg");
const knex = require ("knex");
const { hostname } = require("os");
const { register } = require("module");


//middleware
app.use(bodyparser.json());
app.use(cors());
app.use(bodyparser.urlencoded({ extended:true }));


//routes
app.get("/", (req, res) => {
    res.send("/index");
});

const db = new Pool({
    host: process.env.PGHOST,
    user:process.env.PGUSER,
    password:process.env.PGPASSWORD,
    database:process.env.PGDATABASE,
    port:process.env.PGPORT
})

//signin route

app.post("/signin", async (req, res) => {
    try{
        const { email, password } = req.body;
        const result = await db.query (
            "SELECT * FROM users where email = $1",
            [email]
        );

        if (result.rows.length === 0){
            return res.status(401).json({ success: false, message: "invalid email" });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false });
        }
        //fetch user profiles from user_profile
        const profileResult = await db.query(
            "SELECT * FROM user_profile WHERE email = $1", [email]
        );

        const profile = profileResult.rows[0] || {};
        let role = "user";
        if (email === "admin@email.com") {
        role = "admin";
        }
        res.json({
            success: true,
            message: "Login successful", role,
            user: {
                email: user.email,
                profile: profile
            }
    });
    } catch(err) {
        console.error("Error during signin", err);
        return res.status(500).json({ success: false,});
    }
});

//signup route

app.post("/signup", async (req, res) => {
  try {
    const { FirstName, SecondName, email, PhoneNumber, dob, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Insert into users
    await db.query(
      `INSERT INTO users (firstname, secondname, email, phonenumber, dob, password)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING email`,
      [FirstName, SecondName, email, PhoneNumber, dob, hashedPassword]
    );

    // 2. Generate a random 10-digit account number
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000);

    // 3. Insert into user_profile
    const profileResult = await db.query(
      `INSERT INTO user_profile 
       (firstname, secondname, phonenumber, email, account_number, account_balance, savings_balance, date, card_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING account_number`,
      [FirstName, SecondName, PhoneNumber, email, accountNumber, 0, 0, 0]
    );

    const newAccountNumber = profileResult.rows[0].account_number;

    // 4. Insert initial transaction
    await db.query(
      `INSERT INTO transactions 
       (email, account_number, type, amount, status, date, description)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [email, newAccountNumber, "Account Created", 0, "Success", "Initial account creation"]
    );

    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Error inserting user:", err);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
});



// dashboard route
app.get("/dashboard/:email", async (req, res) => {
  try {
    const email = req.params.email;

    // Fetch profile
    const profileResult = await db.query(
      `SELECT firstname, secondname, email, account_balance, account_number, 
              savings_balance, card_balance 
       FROM user_profile 
       WHERE email = $1`,
      [email]
    );

    if (profileResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found" });
    }

    const user = profileResult.rows[0];

    // Fetch last 4 transactions (⚡ fixed account_number reference)
    const txResult = await db.query(
      `SELECT description, type, amount, status, date, account_number 
       FROM transactions 
       WHERE account_number = $1 
       ORDER BY date DESC 
       LIMIT 4`,
      [user.account_number] // <-- use snake_case from DB row
    );

    return res.json({
      success: true,
      user,
      transactions: txResult.rows || [] // <-- return `transactions`
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});



//server frontend
app.use(express.static("frontend"));



//start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});