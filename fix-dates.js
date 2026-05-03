const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "prison_rehab_system",
});

console.log(" Fixing missing dates...");


db.query(
  "UPDATE enrolled_programs SET enrollment_date = CURDATE() WHERE enrollment_date IS NULL",
  (err, result) => {
    if (err) console.error("Error fixing enrollments:", err);
    else console.log(` Fixed ${result.affectedRows} enrollment dates`);

    
    db.query(
      "UPDATE sessions SET session_date = NOW() WHERE session_date IS NULL",
      (err, result) => {
        if (err) console.error("Error fixing sessions:", err);
        else console.log(` Fixed ${result.affectedRows} session dates`);

       
        db.query(
          "UPDATE prisoners SET admission_date = CURDATE() WHERE admission_date IS NULL",
          (err, result) => {
            if (err) console.error("Error fixing prisoners:", err);
            else
              console.log(
                ` Fixed ${result.affectedRows} prisoner admission dates`,
              );

            console.log("\n All dates have been fixed!");
            db.end();
          },
        );
      },
    );
  },
);
