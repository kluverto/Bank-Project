const express = require("express");
const app = express();
const PORT = process.env.port || 3000;
const bodyparser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();
const postgres = require("postgres");


//middleware
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extend:true} ));

//server frontend
app.use(express.static("frontend"));

//routes
app.get("/", (req, res) => {
    res.send();
});

app.get("/signup", (req, res) => {
    res.send("Successful");
});

app.get("/signin.html", (req, res) => {
    res.send();
});

app.post("/signup", (req, res) => {
    res.json({ message: "Signup successful" });
});

app.post("/signin.html", (req, res) => {
    const {username, password} = req.body;
    if (username === "admin@email.com" && password === "adminpass") {
        res.redirect("admin.html");
    } else if (username === "user1@email.com" && password ==="123456"){
        res.redirect("userdashboard.html");
    } else {
        res.send("invalid credentials");
    }
});

//start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});