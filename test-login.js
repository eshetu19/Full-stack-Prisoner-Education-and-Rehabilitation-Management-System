const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "prison_rehab_system",
});

// Test password
const testPassword = "admin123";

// Query users
db.query("SELECT id, username, password FROM users", async (err, users) => {
  if (err) {
    console.error("Error:", err);
    process.exit(1);
  }

  console.log("=== Testing User Passwords ===\n");

  for (const user of users) {
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`User: ${user.username}`);
    console.log(`  Password valid: ${isValid}`);
    console.log(`  Password hash: ${user.password.substring(0, 30)}...`);
    console.log("---");
  }

  db.end();
});
