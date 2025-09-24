const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  user: "postgres",        // adjust
  host: "localhost",
  database: "postgres",  // adjust
  password: "kluverto",// adjust
  port: 5432
});

(async () => {
  try {
    const email = "admin@email.com";
    const plainPassword = "adminpass";

    // hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // check if admin already exists
    const check = await pool.query("SELECT * FROM register WHERE email = $1", [email]);

    if (check.rows.length > 0) {
      console.log("Admin already exists with this email.");
    } else {
      const result = await pool.query(
        `INSERT INTO register (firstname, secondname, email, phonenumber, dob, password)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING email`,
        ["Admin", "User", email, "0000000000", "2000-01-01", hashedPassword]
      );

      console.log("Admin created:", result.rows[0]);
    }
  } catch (err) {
    console.error("Error creating admin:", err);
  } finally {
    await pool.end();
  }
})();