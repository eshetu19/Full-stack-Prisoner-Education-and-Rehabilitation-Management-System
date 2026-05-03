const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "prison_rehab_system",
});

console.log(" Assigning prisoners and programs to instructor...\n");


db.query(
  "SELECT id FROM users WHERE role = 'instructor' LIMIT 1",
  (err, instructors) => {
    if (err) {
      console.error("Error:", err);
      process.exit(1);
    }

    if (instructors.length === 0) {
      console.log("❌ No instructor found. Creating one...");
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      db.query(
        "INSERT INTO users (username, password, role) VALUES ('instructor1', ?, 'instructor')",
        [hashedPassword],
        (err, result) => {
          if (err) {
            console.error("Error creating instructor:", err);
            process.exit(1);
          }
          console.log("Instructor created with ID:", result.insertId);
          assignToInstructor(result.insertId);
        },
      );
    } else {
      console.log(" Found instructor with ID:", instructors[0].id);
      assignToInstructor(instructors[0].id);
    }
  },
);

function assignToInstructor(instructorId) {
  
  db.query(
    "INSERT IGNORE INTO case_assignments (user_id, prisoner_id) SELECT ?, id FROM prisoners",
    [instructorId],
    (err, result) => {
      if (err) console.error("Error assigning prisoners:", err);
      else
        console.log(
          ` Assigned ${result.affectedRows} prisoners to instructor`,
        );

      
      db.query(
        "INSERT IGNORE INTO instructor_programs (user_id, program_id) SELECT ?, id FROM programs WHERE status = 'Active'",
        [instructorId],
        (err, result) => {
          if (err) console.error("Error assigning programs:", err);
          else
            console.log(
              ` Assigned ${result.affectedRows} programs to instructor`,
            );

          
          db.query(
            `
                SELECT 'Prisoners:' as type, p.name 
                FROM case_assignments ca 
                JOIN prisoners p ON ca.prisoner_id = p.id 
                WHERE ca.user_id = ?
            `,
            [instructorId],
            (err, prisoners) => {
              console.log("\n Assigned Prisoners:");
              if (prisoners && prisoners.length > 0) {
                prisoners.forEach((p) => console.log(`   - ${p.name}`));
              } else {
                console.log("   No prisoners assigned");
              }

              db.query(
                `
                    SELECT 'Programs:' as type, p.name 
                    FROM instructor_programs ip 
                    JOIN programs p ON ip.program_id = p.id 
                    WHERE ip.user_id = ?
                `,
                [instructorId],
                (err, programs) => {
                  console.log("\n Assigned Programs:");
                  if (programs && programs.length > 0) {
                    programs.forEach((p) => console.log(`   - ${p.name}`));
                  } else {
                    console.log("   No programs assigned");
                  }

                  console.log(
                    "\n Done! Login as instructor to see the data.",
                  );
                  db.end();
                },
              );
            },
          );
        },
      );
    },
  );
}
