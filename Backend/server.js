const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
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
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");


//middleware
app.use(bodyparser.json());
app.use(cors());
app.use(bodyparser.urlencoded({ extended:true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join a room (for a single user conversation with admin)
  // The client should send { email, role } when connecting
  socket.on("joinRoom", ({ email, role }) => {
    socket.join(email); // room name = user email
    socket.role = role; // store role on socket
    socket.email = email;
    console.log(`${role} joined room: ${email}`);
  });

  // Listen for messages
  socket.on("chatMessage", async ({ text, sender, receiver }) => {
  const timestamp = new Date();

  try {
    await db.query(
      `INSERT INTO messages (sender, receiver, text, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [sender, receiver, text, timestamp]
    );
  } catch (err) {
    console.error("Error saving message:", err);
  }

  // Emit message to both sender and receiver rooms
  io.to(sender).emit("chatMessage", { text, sender, timestamp });
  io.to(receiver).emit("chatMessage", { text, sender, timestamp });
});

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

//routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {rejectUnauthorized: false}
})

// GET chat history for a user
app.get("/chat/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const result = await db.query(
      `SELECT sender, receiver, text, timestamp
       FROM messages
       WHERE sender = $1 OR receiver = $1
       ORDER BY "timestamp" ASC`,
      [email]
    );

    res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
});

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
      `SELECT * 
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

    // Fetch last 4 transactions
    const txResult = await db.query(
      `SELECT description, type, amount, status, date, account_number 
       FROM transactions 
       WHERE account_number = $1 
       ORDER BY date DESC 
       LIMIT 5`,
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

// Admin stats route
app.get("/admin/stats", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
         COUNT(*) AS total_users,
         COALESCE(SUM(account_balance), 0) AS total_balance
       FROM user_profile`
    );

    const stats = result.rows[0];
    return res.json({
      success: true,
      total_users: Number(stats.total_users),
      total_balance: Number(stats.total_balance)
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//Admin create new user route
app.post("/admin/create-user", async (req, res) => {
  try {
    const { firstname, secondname, email, phonenumber, password, account_balance, savings_balance, card_balance } = req.body;
    const dob = date_of_birth ? new Date(date_of_birth).toISOString().split("T")[0] : null;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table
    await db.query(
      `INSERT INTO users (firstname, secondname, email, phonenumber, dob, password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [firstname, secondname, email, phonenumber, dob, hashedPassword]
    );

    // Generate random 10-digit account number
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000);

    // Insert into user_profile table
    await db.query(
      `INSERT INTO user_profile (firstname, secondname, phonenumber, email, account_number, account_balance, savings_balance, card_balance, dob)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [firstname, secondname, phonenumber, email, accountNumber, Number(account_balance), Number(savings_balance), Number(card_balance), dob]
    );

    //Insert into transactions table
    await db.query(
      `INSERT INTO transactions 
       (email, account_number, type, amount, status, date, description)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [email, accountNumber, "Account Created",  Number(account_balance), "Success", "Initial account creation"]
    );

    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/admindash/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM user_profile");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Returns a list of users with email and name
app.get("/admin/users", async (req, res) => {
  try {
    const result = await db.query("SELECT firstname, secondname, email FROM user_profile ORDER BY firstname");
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin fetch user by account number
app.get("/admin/user/:account", async (req, res) => {
  try {
    const accountNumber = req.params.account;

    const result = await db.query(
      `SELECT firstname, secondname, phonenumber, email, dob, account_number, account_balance, savings_balance, card_balance
       FROM user_profile
       WHERE account_number = $1`,
      [accountNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//admin edit user details
app.put("/admin/user/:account", async (req, res) => {
  try {
    const accountNumber = req.params.account;
    const {
      firstname,
      secondname,
      phonenumber,
      date_of_birth,
      account_balance,
      savings_balance,
      card_balance
    } = req.body;

    // Format date for Postgres
    const dob = date_of_birth ? new Date(date_of_birth).toISOString().split("T")[0] : null;

    const result = await db.query(
      `UPDATE user_profile
       SET firstname = $1,
           secondname = $2,
           phonenumber = $3,
           dob = $4,
           account_balance = $5,
           savings_balance = $6,
           card_balance = $7
       WHERE account_number = $8
       RETURNING *`,
      [
        firstname,
        secondname,
        phonenumber,
        dob,
        Number(account_balance),
        Number(savings_balance),
        Number(card_balance),
        accountNumber
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin credit/debit balances
app.post("/admin/transaction/:accountNumber", async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;
    const { email, type, target, amount, description, status } = req.body;
    const amt = parseFloat(amount);

    // Validate type
    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type (credit/debit)" });
    }

    // Validate target
    if (!["account_balance", "savings_balance", "card_balance"].includes(target)) {
      return res.status(400).json({ success: false, message: "Invalid balance target" });
    }

    // Validate amount
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Validate status
    if (!status || !["pending", "completed", "failed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    let newBalance = null;

    // Only update balance if status is "completed"
    if (status === "completed") {
      const userResult = await db.query(
        `SELECT ${target}, email FROM user_profile WHERE account_number = $1`,
        [accountNumber]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      let currentBalance = parseFloat(userResult.rows[0][target]);

      // Calculate new balance
      newBalance = type === "credit" ? currentBalance + amt : currentBalance - amt;

      if (type === "debit" && newBalance < 0) {
        return res.status(400).json({ success: false, message: "Insufficient funds" });
      }

      // Apply balance update
      await db.query(
        `UPDATE user_profile SET ${target} = $1 WHERE account_number = $2`,
        [newBalance, accountNumber]
      );
    }

    // Always insert transaction log
    await db.query(
      `INSERT INTO transactions 
       (account_number, email, type, amount, status, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [accountNumber, email, type, amt, status, description || "Admin action"]
    );

    res.json({
      success: true,
      message: `Transaction recorded with status: ${status}`,
      ...(newBalance !== null ? { newBalance } : {})
    });

  } catch (err) {
    console.error("Admin transaction error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/admin/user/email/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const result = await db.query(
      "SELECT firstname, secondname, email, account_number FROM user_profile WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error fetching user by email:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin get recent transactions
app.get("/admin/recent-transactions", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT email, account_number, type, status, description, amount, date
       FROM transactions
       ORDER BY date DESC
       LIMIT 10`
    );

    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//image upload setup
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "png", "jpeg"]
  }
});

const upload = multer({ storage });

app.post("/upload-profile-pic", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { email } = req.body;
    const imageUrl = req.file.path;

    await db.query(
      "UPDATE user_profile SET profile_image = $1 WHERE email = $2",
      [imageUrl, email]
    );

    res.json({ success: true, image: imageUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});



//server frontend
app.use(express.static(path.join(__dirname, "../frontend")));


//start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});