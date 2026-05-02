const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 3306,
});

console.log("🌱 Starting database seeding...");

db.connect(async (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }

  console.log("✅ Connected to MySQL");

  // Create database if not exists
  db.query(
    `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "prison_rehab_system"}`,
    (err) => {
      if (err) throw err;
      console.log("✅ Database created/selected");

      db.changeUser(
        { database: process.env.DB_NAME || "prison_rehab_system" },
        async (err) => {
          if (err) throw err;

          await dropAllTables();
          await createTables();
          await insertSeedData();

          console.log("\n🎉 Database seeding completed successfully!");
          console.log("\n📝 Login Credentials:");
          console.log(
            "   Username: admin     | Password: admin123 | Role: Administrator",
          );
          console.log(
            "   Username: instructor1 | Password: admin123 | Role: Instructor",
          );
          console.log(
            "   Username: viewer1   | Password: admin123 | Role: Viewer",
          );
          console.log("\n🚀 You can now start the server: npm start");

          db.end();
        },
      );
    },
  );
});

async function dropAllTables() {
  return new Promise((resolve, reject) => {
    const tables = [
      "activity_log",
      "case_assignments",
      "instructor_programs",
      "sessions",
      "enrolled_programs",
      "staff",
      "programs",
      "prisoners",
      "facilities",
      "users",
    ];

    let completed = 0;
    if (tables.length === 0) {
      resolve();
      return;
    }

    tables.forEach((table) => {
      db.query(`DROP TABLE IF EXISTS ${table}`, (err) => {
        if (err) console.log(`Note: ${table} may not exist`);
        completed++;
        if (completed === tables.length) {
          console.log("✅ Tables dropped");
          resolve();
        }
      });
    });
  });
}

async function createTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'instructor', 'viewer', 'staff') DEFAULT 'viewer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

      `CREATE TABLE IF NOT EXISTS prisoners (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_number VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
                age INT,
                sentence_length VARCHAR(50),
                prison_block VARCHAR(100),
                enrollment_status ENUM('Enrolled', 'Not Enrolled', 'Completed') DEFAULT 'Not Enrolled',
                education VARCHAR(100),
                skills TEXT,
                marital_status VARCHAR(50),
                notes TEXT,
                image_url VARCHAR(255),
                admission_date DATE DEFAULT (CURDATE()),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

      `CREATE TABLE IF NOT EXISTS programs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                program_type ENUM('Vocational', 'Educational', 'Behavioral') DEFAULT 'Vocational',
                instructor VARCHAR(100),
                duration VARCHAR(50),
                prerequisite TEXT,
                description TEXT,
                thumbnail_url VARCHAR(255),
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                max_capacity INT DEFAULT 50,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

      `CREATE TABLE IF NOT EXISTS enrolled_programs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                prisoner_id INT,
                program_id INT,
                enrollment_date DATE,
                completion_percentage DECIMAL(5,2) DEFAULT 0,
                status ENUM('In Progress', 'Completed', 'On Warning', 'Dropped') DEFAULT 'In Progress',
                FOREIGN KEY (prisoner_id) REFERENCES prisoners(id) ON DELETE CASCADE,
                FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
            )`,

      `CREATE TABLE IF NOT EXISTS sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(100) NOT NULL,
                location VARCHAR(100),
                session_date DATETIME,
                duration VARCHAR(50),
                coordinator VARCHAR(100),
                prisoner_id INT,
                notes TEXT,
                status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
                FOREIGN KEY (prisoner_id) REFERENCES prisoners(id) ON DELETE SET NULL
            )`,

      `CREATE TABLE IF NOT EXISTS staff (
                id INT PRIMARY KEY AUTO_INCREMENT,
                staff_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
                age INT,
                education VARCHAR(100),
                facility VARCHAR(100),
                role VARCHAR(100),
                email VARCHAR(100),
                phone VARCHAR(20),
                employment_status ENUM('Active', 'On leave', 'Inactive') DEFAULT 'Active',
                image_url VARCHAR(255),
                hire_date DATE DEFAULT (CURDATE())
            )`,

      `CREATE TABLE IF NOT EXISTS facilities (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                capacity INT,
                status ENUM('Complete', 'Under Maintenance', 'Inactive') DEFAULT 'Complete'
            )`,

      `CREATE TABLE IF NOT EXISTS instructor_programs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                program_id INT NOT NULL,
                assigned_date DATE DEFAULT (CURDATE()),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
                UNIQUE KEY unique_assignment (user_id, program_id)
            )`,

      `CREATE TABLE IF NOT EXISTS case_assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                prisoner_id INT NOT NULL,
                assigned_date DATE DEFAULT (CURDATE()),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (prisoner_id) REFERENCES prisoners(id) ON DELETE CASCADE,
                UNIQUE KEY unique_case (user_id, prisoner_id)
            )`,

      `CREATE TABLE IF NOT EXISTS activity_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                username VARCHAR(50),
                action VARCHAR(255),
                details TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`,
    ];

    let completed = 0;
    queries.forEach((query) => {
      db.query(query, (err) => {
        if (err) {
          console.error("Error creating table:", err);
          reject(err);
        } else {
          completed++;
          if (completed === queries.length) {
            console.log("✅ All tables created");
            resolve();
          }
        }
      });
    });
  });
}

async function insertSeedData() {
  return new Promise((resolve, reject) => {
    // Create a fresh hash for 
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    console.log("✅ Password hash created for admin123");

    const queries = [
      // Users
      `INSERT INTO users (id, username, password, role) VALUES 
                (1, 'admin', '${hashedPassword}', 'admin'),
                (2, 'instructor1', '${hashedPassword}', 'instructor'),
                (3, 'viewer1', '${hashedPassword}', 'viewer')
                ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role)`,

      // Facilities
      `INSERT INTO facilities (id, name, capacity, status) VALUES 
                (1, 'Kality Maremiya', 430, 'Complete'),
                (2, 'Daleti Maremiya', 374, 'Complete'),
                (3, 'Sebbeta Maremiya', 120, 'Complete'),
                (4, 'Kality Maremiya2', 122, 'Under Maintenance')
                ON DUPLICATE KEY UPDATE name = VALUES(name)`,

      // Prisoners
      `INSERT INTO prisoners (id, id_number, name, gender, age, sentence_length, prison_block, enrollment_status, education, skills) VALUES 
                (1, 'EPDR/77890', 'Markos Smith', 'Male', 31, '10 Years', 'Kaliti', 'Enrolled', 'High School', 'Carpentry, Woodworking'),
                (2, 'EPDR/77891', 'Abubeker Nebiyu', 'Male', 29, '5 Years', 'Kaliti', 'Enrolled', 'Bachelor\'s', 'Teaching, Leadership'),
                (3, 'EPDR/77892', 'Samuel Kebede', 'Male', 41, '8 Years', 'Daleti', 'Enrolled', 'High School', 'Farming, Agriculture'),
                (4, 'EPDR/77893', 'Shelema Chala', 'Male', 39, '3 Years', 'Sebbeta', 'Enrolled', 'Diploma', 'Mechanics, Repair'),
                (5, 'EPDR/77894', 'Habtom Seyoum', 'Male', 42, '15 Years', 'Kaliti', 'Not Enrolled', 'High School', 'Construction')
                ON DUPLICATE KEY UPDATE name = VALUES(name)`,

      // Programs
      `INSERT INTO programs (id, name, program_type, instructor, duration, description, status, max_capacity) VALUES 
                (1, 'Advanced Carpentry', 'Vocational', 'Ayinalem mulatu', '6 months', 'Professional carpentry and woodworking skills', 'Active', 50),
                (2, 'GED Completion', 'Educational', 'Liam Rosenniro', '4 months', 'High school equivalency preparation', 'Active', 45),
                (3, 'Anger Management', 'Behavioral', 'Sarah Jenkins', '3 months', 'Behavioral therapy and anger control', 'Active', 40),
                (4, 'Digital Literacy', 'Educational', 'Ayele Kebede', '2 months', 'Basic computing and digital skills', 'Active', 50),
                (5, 'Art and Design', 'Vocational', 'Ayinalem mulatu', '4 months', 'Creative arts and design principles', 'Active', 45),
                (6, 'Substance Abuse Program', 'Behavioral', 'Dr. Helen Clark', '6 months', 'Addiction recovery and support', 'Active', 50)
                ON DUPLICATE KEY UPDATE name = VALUES(name)`,

      // Enrollments
      `INSERT INTO enrolled_programs (prisoner_id, program_id, enrollment_date, completion_percentage, status) VALUES 
                (1, 1, '2023-10-03', 90, 'Completed'),
                (1, 2, '2023-10-03', 30, 'In Progress'),
                (1, 3, '2023-10-03', 80, 'Completed'),
                (2, 1, '2023-11-15', 45, 'In Progress'),
                (3, 4, '2023-09-20', 100, 'Completed'),
                (4, 3, '2023-12-01', 60, 'In Progress'),
                (5, 4, '2023-10-10', 25, 'On Warning')`,

      // Sessions
      `INSERT INTO sessions (title, location, session_date, duration, coordinator, prisoner_id, status) VALUES 
                ('Vocational Workshop', 'Workshop Building', NOW(), '2 hours', 'Ayinalem mulatu', 1, 'Completed'),
                ('Counseling Session', 'Counseling Center', NOW(), '1 hour', 'Sarah Jenkins', 1, 'Completed'),
                ('Library Access', 'Library', NOW(), '1 hour', 'Librarian', 1, 'Completed'),
                ('Carpentry Class', 'Workshop', NOW(), '3 hours', 'Ayinalem mulatu', 2, 'Scheduled'),
                ('Computer Lab', 'Computer Room', NOW(), '2 hours', 'Ayele Kebede', 3, 'Completed')`,

      // Staff
      `INSERT INTO staff (staff_id, name, gender, age, education, facility, role, email, employment_status) VALUES 
                ('STF/001', 'Dr. Sarah Jenkins', 'Female', 45, 'PhD Psychology', 'Kaliti', 'Lead Instructor', 'sarah.jenkins@rehab.gov', 'Active'),
                ('STF/002', 'Markos Smith', 'Male', 38, 'Masters Social Work', 'Daleti', 'Case Manager', 'markos.smith@rehab.gov', 'Active'),
                ('STF/003', 'Helena Mulatu', 'Female', 42, 'Masters Counseling', 'Kaliti', 'Lead Counselor', 'helena.mulatu@rehab.gov', 'On leave'),
                ('STF/004', 'Prof. Abel Chala', 'Male', 55, 'PhD Education', 'Sebbeta', 'Instructor', 'abel.chala@rehab.gov', 'Active'),
                ('STF/005', 'Ins. Alemu Tola', 'Male', 35, 'Bachelor\'s', 'Kaliti', 'Security Liaison', 'alemu.tola@rehab.gov', 'Active'),
                ('STF/006', 'Lomi Debebe', 'Female', 40, 'Masters', 'Daleti', 'Assistant Professor', 'lomi.debebe@rehab.gov', 'On leave')`,

      // Instructor program assignments
      `INSERT INTO instructor_programs (user_id, program_id) VALUES 
                (2, 1), (2, 2), (2, 3)
                ON DUPLICATE KEY UPDATE assigned_date = CURDATE()`,

      // Case assignments
      `INSERT INTO case_assignments (user_id, prisoner_id) VALUES 
                (2, 1), (2, 2), (2, 3)
                ON DUPLICATE KEY UPDATE assigned_date = CURDATE()`,
    ];

    let completed = 0;
    queries.forEach((query) => {
      db.query(query, (err) => {
        if (err) {
          console.error("Error inserting data:", err);
          reject(err);
        } else {
          completed++;
          if (completed === queries.length) {
            console.log("✅ Seed data inserted");

            // Verify users were inserted
            db.query("SELECT id, username, role FROM users", (err, users) => {
              if (err) console.error("Error verifying users:", err);
              else {
                console.log("📋 Users in database:");
                users.forEach((u) => {
                  console.log(`   - ${u.username} (${u.role})`);
                });
              }
              resolve();
            });
          }
        }
      });
    });
  });
}
