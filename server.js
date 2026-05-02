const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 3600000 },
  }),
);

// Create uploads directory if not exists
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Database connection
// Database connection pool (PRODUCTION READY)
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "prison_rehab_system",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Test the connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("Please check your environment variables:");
    console.error("  DB_HOST:", process.env.DB_HOST);
    console.error("  DB_USER:", process.env.DB_USER);
    console.error("  DB_NAME:", process.env.DB_NAME);
    console.error("  DB_PORT:", process.env.DB_PORT);
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL database");
    connection.release();
  }
});

//  ROLE-BASED MIDDLEWARE

// Log user activity - MUST BE DEFINED BEFORE USE
function logActivity(req, action, details = null) {
  if (req.session && req.session.userId) {
    const query = `INSERT INTO activity_log (user_id, username, action, details, ip_address) 
                   VALUES (?, ?, ?, ?, ?)`;
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    db.query(
      query,
      [req.session.userId, req.session.username, action, details, ip],
      (err) => {
        if (err) console.error("Error logging activity:", err);
      },
    );
  }
}

// Check if user is authenticated
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Check if user is admin
function isAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
}

// Check if user is admin or instructor
function isAdminOrInstructor(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.role !== "admin" && req.session.role !== "instructor") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin or Instructor only." });
  }
  next();
}

//  AUTHENTICATION ROUTES

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt:", username);

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        console.log("User not found:", username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = results[0];
      const validPassword = await bcrypt.compare(password, user.password);

      console.log("Password valid:", validPassword);

      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      console.log("Login successful:", username, "Role:", user.role);

      logActivity(req, "LOGIN", `User logged in with role: ${user.role}`);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    },
  );
});

app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/api/check-auth", (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        username: req.session.username,
        role: req.session.role,
        userId: req.session.userId,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get user role endpoint
app.get("/api/user-role", isAuthenticated, (req, res) => {
  res.json({
    role: req.session.role,
    username: req.session.username,
    userId: req.session.userId,
  });
});

//  PRISONER ROUTES WITH ROLE-BASED ACCESS

app.get("/api/prisoners", isAuthenticated, (req, res) => {
  const { search, block, status, page = 1, limit = 10 } = req.query;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT p.*, 
                    (SELECT AVG(ep.completion_percentage) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as avg_completion_rate,
                    (SELECT COUNT(*) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as programs_enrolled
                 FROM prisoners p WHERE 1=1`;
  let countQuery = "SELECT COUNT(*) as total FROM prisoners WHERE 1=1";
  let params = [];

  // Role-based filtering
  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)`;
    countQuery += ` AND id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)`;
    params.push(userId);
  }

  if (userRole === "viewer") {
    query = `SELECT p.id, p.name, p.id_number, p.gender, p.age, p.prison_block, p.enrollment_status,
                    (SELECT AVG(ep.completion_percentage) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as avg_completion_rate,
                    (SELECT COUNT(*) FROM enrolled_programs ep WHERE ep.prisoner_id = p.id) as programs_enrolled
                 FROM prisoners p WHERE 1=1`;
  }

  if (search) {
    query += " AND (p.name LIKE ? OR p.id_number LIKE ?)";
    countQuery += " AND (name LIKE ? OR id_number LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (block && block !== "all") {
    query += " AND p.prison_block = ?";
    countQuery += " AND prison_block = ?";
    params.push(block);
  }
  if (status && status !== "all") {
    query += " AND p.enrollment_status = ?";
    countQuery += " AND enrollment_status = ?";
    params.push(status);
  }

  const offset = (page - 1) * limit;
  query += " ORDER BY p.id DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.query(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      let statsQuery = `SELECT 
                        AVG(completion_percentage) as overall_avg,
                        COUNT(DISTINCT prisoner_id) as enrolled_count,
                        (SELECT COUNT(*) FROM prisoners WHERE enrollment_status = 'Not Enrolled') as awaiting_count
                      FROM enrolled_programs`;
      let statsParams = [];

      if (userRole === "instructor") {
        statsQuery = `SELECT 
                        AVG(ep.completion_percentage) as overall_avg,
                        COUNT(DISTINCT ep.prisoner_id) as enrolled_count,
                        0 as awaiting_count
                      FROM enrolled_programs ep
                      JOIN case_assignments ca ON ep.prisoner_id = ca.prisoner_id
                      WHERE ca.user_id = ?`;
        statsParams = [userId];
      }

      db.query(statsQuery, statsParams, (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          prisoners: results,
          total: countResult[0].total,
          page: parseInt(page),
          totalPages: Math.ceil(countResult[0].total / limit),
          stats: {
            avgCompletion: Math.round(stats[0]?.overall_avg || 0),
            enrolledCount: stats[0]?.enrolled_count || 0,
            awaitingCount: stats[0]?.awaiting_count || 0,
          },
          userRole: userRole,
        });
      });
    });
  });
});

// Get single prisoner - with role check
app.get("/api/prisoners/:id", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;
  const prisonerId = req.params.id;

  function proceedGetPrisoner() {
    let query = "SELECT * FROM prisoners WHERE id = ?";
    if (userRole === "viewer") {
      query =
        "SELECT id, name, id_number, gender, age, prison_block, enrollment_status, admission_date FROM prisoners WHERE id = ?";
    }

    db.query(query, [prisonerId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Prisoner not found" });

      db.query(
        `SELECT p.*, ep.enrollment_date, ep.completion_percentage, ep.status 
         FROM enrolled_programs ep 
         JOIN programs p ON ep.program_id = p.id 
         WHERE ep.prisoner_id = ?`,
        [prisonerId],
        (err, programs) => {
          if (err) return res.status(500).json({ error: err.message });

          db.query(
            `SELECT * FROM sessions WHERE prisoner_id = ? ORDER BY session_date DESC LIMIT 10`,
            [prisonerId],
            (err, sessions) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({
                prisoner: results[0],
                programs,
                sessions,
                userRole: userRole,
              });
            },
          );
        },
      );
    });
  }

  // Check if instructor has access to this prisoner
  if (userRole === "instructor") {
    db.query(
      "SELECT * FROM case_assignments WHERE user_id = ? AND prisoner_id = ?",
      [userId, prisonerId],
      (err, access) => {
        if (err) return res.status(500).json({ error: err.message });
        if (access.length === 0) {
          return res.status(403).json({
            error: "Access denied. You are not assigned to this prisoner.",
          });
        }
        proceedGetPrisoner();
      },
    );
  } else {
    proceedGetPrisoner();
  }
});

// Add prisoner - Admin only
app.post("/api/prisoners", isAdmin, upload.single("image"), (req, res) => {
  const {
    full_name,
    gender,
    age,
    sentence_length,
    prison,
    education,
    skills,
    marital_status,
    notes,
  } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const id_number = `EPDR/${Date.now()}`;

  db.query(
    `INSERT INTO prisoners (id_number, name, gender, age, sentence_length, prison_block, education, skills, marital_status, notes, image_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_number,
      full_name,
      gender,
      age,
      sentence_length,
      prison,
      education,
      skills,
      marital_status,
      notes,
      image_url,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(
        req,
        "CREATE_PRISONER",
        `Created prisoner: ${full_name} (${id_number})`,
      );
      res.json({ success: true, id: result.insertId, id_number });
    },
  );
});

// Update prisoner - Admin only
app.put("/api/prisoners/:id", isAdmin, upload.single("image"), (req, res) => {
  const { full_name, gender, age, sentence_length, prison, enrollment_status } =
    req.body;
  let query =
    "UPDATE prisoners SET name=?, gender=?, age=?, sentence_length=?, prison_block=?, enrollment_status=?";
  let params = [
    full_name,
    gender,
    age,
    sentence_length,
    prison,
    enrollment_status,
  ];

  if (req.file) {
    query += ", image_url=?";
    params.push(`/uploads/${req.file.filename}`);
  }
  query += " WHERE id=?";
  params.push(req.params.id);

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    logActivity(
      req,
      "UPDATE_PRISONER",
      `Updated prisoner ID: ${req.params.id}`,
    );
    res.json({ success: true });
  });
});

// Delete prisoner - Admin only
app.delete("/api/prisoners/:id", isAdmin, (req, res) => {
  db.query(
    "SELECT name FROM prisoners WHERE id = ?",
    [req.params.id],
    (err, prisoner) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query(
        "DELETE FROM prisoners WHERE id = ?",
        [req.params.id],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          logActivity(
            req,
            "DELETE_PRISONER",
            `Deleted prisoner: ${prisoner[0]?.name || "Unknown"} (ID: ${req.params.id})`,
          );
          res.json({ success: true });
        },
      );
    },
  );
});

// PROGRAM ROUTES

app.get("/api/programs", isAuthenticated, (req, res) => {
  const { type, status } = req.query;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT p.*, (SELECT COUNT(*) FROM enrolled_programs WHERE program_id = p.id) as enrolled_count
               FROM programs p WHERE 1=1`;
  let params = [];

  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT program_id FROM instructor_programs WHERE user_id = ?)`;
    params.push(userId);
  }

  if (type && type !== "all") {
    query += " AND program_type = ?";
    params.push(type);
  }
  if (status && status !== "all") {
    query += " AND status = ?";
    params.push(status);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
// Add program - Admin only
app.post("/api/programs", isAdmin, upload.single("thumbnail"), (req, res) => {
  const {
    program_title,
    program_type,
    instructor,
    duration,
    prerequisite,
    program_description,
    max_capacity,
  } = req.body;
  const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;

  db.query(
    `INSERT INTO programs (name, program_type, instructor, duration, prerequisite, description, thumbnail_url, max_capacity) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      program_title,
      program_type,
      instructor,
      duration,
      prerequisite,
      program_description,
      thumbnail_url,
      max_capacity || 50,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req, "CREATE_PROGRAM", `Created program: ${program_title}`);
      res.json({ success: true, id: result.insertId });
    },
  );
});
//  DASHBOARD STATS
app.get("/api/dashboard/stats", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;

  let totalPrisonersQuery = "SELECT COUNT(*) as count FROM prisoners";
  let activeProgramsQuery =
    "SELECT COUNT(*) as count FROM programs WHERE status = 'Active'";
  let currentEnrollmentsQuery =
    "SELECT COUNT(*) as count FROM enrolled_programs WHERE status != 'Completed'";
  let sessionsThisMonthQuery = `SELECT COUNT(*) as count FROM sessions WHERE MONTH(session_date) = MONTH(CURDATE()) AND YEAR(session_date) = YEAR(CURDATE())`;

  // For instructors, filter based on assignments
  if (userRole === "instructor") {
    totalPrisonersQuery = `SELECT COUNT(*) as count FROM prisoners p 
                           WHERE p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
    currentEnrollmentsQuery = `SELECT COUNT(*) as count FROM enrolled_programs ep 
                               WHERE ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})
                               AND ep.status != 'Completed'`;
  }

  Promise.all([
    new Promise((resolve, reject) => {
      db.query(totalPrisonersQuery, (err, results) => {
        if (err) reject(err);
        else resolve({ key: "totalPrisoners", value: results[0]?.count || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(activeProgramsQuery, (err, results) => {
        if (err) reject(err);
        else resolve({ key: "activePrograms", value: results[0]?.count || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(currentEnrollmentsQuery, (err, results) => {
        if (err) reject(err);
        else
          resolve({ key: "currentEnrollments", value: results[0]?.count || 0 });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(sessionsThisMonthQuery, (err, results) => {
        if (err) reject(err);
        else
          resolve({ key: "sessionsThisMonth", value: results[0]?.count || 0 });
      });
    }),
  ])
    .then((results) => {
      const stats = {};
      results.forEach((r) => {
        stats[r.key] = r.value;
      });
      res.json(stats);
    })
    .catch((err) => {
      console.error("Dashboard stats error:", err);
      res.status(500).json({ error: err.message });
    });
});

//  DASHBOARD RECENT ACTIVITY
app.get("/api/dashboard/recent-activity", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT 
                p.name as prisoner_name, 
                pr.name as program_name, 
                COALESCE(s.session_date, ep.enrollment_date, p.admission_date, NOW()) as activity_date,
                ep.status,
                CASE 
                    WHEN s.session_date IS NOT NULL THEN 'Session'
                    WHEN ep.enrollment_date IS NOT NULL THEN 'Enrollment'
                    ELSE 'Admission'
                END as activity_type
              FROM prisoners p
              LEFT JOIN enrolled_programs ep ON p.id = ep.prisoner_id
              LEFT JOIN programs pr ON ep.program_id = pr.id
              LEFT JOIN sessions s ON s.prisoner_id = p.id
              WHERE p.id IS NOT NULL`;

  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
  }

  query += ` ORDER BY activity_date DESC LIMIT 10`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Recent activity error:", err);
      return res.status(500).json({ error: err.message });
    }

    const formattedResults = results.map((row) => ({
      ...row,
      formatted_date: row.activity_date
        ? new Date(row.activity_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "No date",
    }));

    res.json(formattedResults);
  });
});

//  REPORTS
app.get("/api/reports/program-stats", isAuthenticated, (req, res) => {
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT 
                pr.id,
                pr.name, 
                pr.program_type, 
                COUNT(ep.id) as enrollments,
                COALESCE(ROUND(AVG(ep.completion_percentage), 1), 0) as avg_completion,
                SUM(CASE WHEN ep.status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN ep.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count
              FROM programs pr
              LEFT JOIN enrolled_programs ep ON pr.id = ep.program_id`;

  if (userRole === "instructor") {
    query += ` AND ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
  }

  query += ` GROUP BY pr.id, pr.name, pr.program_type ORDER BY avg_completion DESC`;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    let overallQuery = `SELECT 
                          COUNT(*) as total_enrollments,
                          COALESCE(ROUND(AVG(completion_percentage), 1), 0) as overall_avg_completion,
                          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as total_completed,
                          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as total_in_progress
                        FROM enrolled_programs`;

    if (userRole === "instructor") {
      overallQuery = `SELECT 
                        COUNT(*) as total_enrollments,
                        COALESCE(ROUND(AVG(completion_percentage), 1), 0) as overall_avg_completion,
                        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as total_completed,
                        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as total_in_progress
                      FROM enrolled_programs ep
                      WHERE ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
    }

    db.query(overallQuery, (err, overallStats) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        programStats: results,
        overall: overallStats[0] || {
          total_enrollments: 0,
          overall_avg_completion: 0,
          total_completed: 0,
          total_in_progress: 0,
        },
      });
    });
  });
});

//  ENROLLMENT ROUTES

// Get all enrollments with pagination and stats
app.get("/api/enrollments", isAuthenticated, (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT ep.*, p.name as prisoner_name, p.id_number, pr.name as program_name, pr.program_type, pr.max_capacity
               FROM enrolled_programs ep
               JOIN prisoners p ON ep.prisoner_id = p.id
               JOIN programs pr ON ep.program_id = pr.id`;
  let countQuery = `SELECT COUNT(*) as total FROM enrolled_programs ep`;
  let params = [];
  let conditions = [];

  // Role-based filtering
  if (userRole === "instructor") {
    conditions.push(
      "ep.prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)",
    );
    params.push(userId);
  }

  if (status && status !== "all") {
    conditions.push("ep.status = ?");
    params.push(status);
  }

  if (search) {
    conditions.push("(p.name LIKE ? OR pr.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
    countQuery += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY ep.enrollment_date DESC LIMIT ? OFFSET ?";
  const offset = (page - 1) * limit;
  params.push(parseInt(limit), parseInt(offset));

  db.query(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      // Calculate statistics for cards
      let activeQuery = `SELECT COUNT(*) as active FROM enrolled_programs WHERE status != 'Completed'`;
      let completedQuery = `SELECT COUNT(*) as completed FROM enrolled_programs WHERE status = 'Completed'`;
      let avgQuery = `SELECT AVG(completion_percentage) as avg FROM enrolled_programs`;
      let totalQuery = `SELECT COUNT(*) as total FROM enrolled_programs`;

      // For instructors, filter stats
      if (userRole === "instructor") {
        activeQuery = `SELECT COUNT(*) as active FROM enrolled_programs 
                       WHERE status != 'Completed' 
                       AND prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
        completedQuery = `SELECT COUNT(*) as completed FROM enrolled_programs 
                          WHERE status = 'Completed' 
                          AND prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
        avgQuery = `SELECT AVG(completion_percentage) as avg FROM enrolled_programs 
                    WHERE prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
        totalQuery = `SELECT COUNT(*) as total FROM enrolled_programs 
                      WHERE prisoner_id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ${userId})`;
      }

      Promise.all([
        new Promise((resolve, reject) => {
          db.query(totalQuery, (err, totalResult) => {
            if (err) reject(err);
            else resolve(totalResult[0]?.total || 0);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(activeQuery, (err, activeResult) => {
            if (err) reject(err);
            else resolve(activeResult[0]?.active || 0);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(completedQuery, (err, completedResult) => {
            if (err) reject(err);
            else resolve(completedResult[0]?.completed || 0);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(avgQuery, (err, avgResult) => {
            if (err) reject(err);
            else resolve(Math.round(avgResult[0]?.avg || 0));
          });
        }),
      ])
        .then(
          ([
            totalEnrollments,
            activeEnrollments,
            completedEnrollments,
            avgCompletion,
          ]) => {
            res.json({
              enrollments: results,
              total: countResult[0].total,
              page: parseInt(page),
              totalPages: Math.ceil(countResult[0].total / limit),
              stats: {
                totalEnrollments: totalEnrollments,
                activeEnrollments: activeEnrollments,
                completedEnrollments: completedEnrollments,
                avgCompletion: avgCompletion,
              },
            });
          },
        )
        .catch((err) => {
          console.error("Stats error:", err);
          res.json({
            enrollments: results,
            total: countResult[0].total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult[0].total / limit),
            stats: {
              totalEnrollments: 0,
              activeEnrollments: 0,
              completedEnrollments: 0,
              avgCompletion: 0,
            },
          });
        });
    });
  });
});
app.post("/api/enrollments", isAdminOrInstructor, (req, res) => {
  const { prisoner_id, program_id, enrollment_date } = req.body;
  const finalEnrollmentDate =
    enrollment_date || new Date().toISOString().split("T")[0];

  db.query(
    "SELECT * FROM enrolled_programs WHERE prisoner_id = ? AND program_id = ?",
    [prisoner_id, program_id],
    (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing.length > 0) {
        return res
          .status(400)
          .json({ error: "Prisoner is already enrolled in this program" });
      }

      db.query(
        "SELECT max_capacity, (SELECT COUNT(*) FROM enrolled_programs WHERE program_id = ?) as current_count FROM programs WHERE id = ?",
        [program_id, program_id],
        (err, program) => {
          if (err) return res.status(500).json({ error: err.message });
          if (
            program[0] &&
            program[0].current_count >= program[0].max_capacity
          ) {
            return res
              .status(400)
              .json({ error: "Program has reached maximum capacity" });
          }

          db.query(
            `INSERT INTO enrolled_programs (prisoner_id, program_id, enrollment_date, completion_percentage, status) 
             VALUES (?, ?, ?, 0, 'In Progress')`,
            [prisoner_id, program_id, finalEnrollmentDate],
            (err, result) => {
              if (err) return res.status(500).json({ error: err.message });
              db.query(
                'UPDATE prisoners SET enrollment_status = "Enrolled" WHERE id = ?',
                [prisoner_id],
              );
              res.json({ success: true, id: result.insertId });
            },
          );
        },
      );
    },
  );
});

app.put("/api/enrollments/:id", isAdminOrInstructor, (req, res) => {
  const { completion_percentage, status } = req.body;

  db.query(
    "UPDATE enrolled_programs SET completion_percentage=?, status=? WHERE id=?",
    [completion_percentage, status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (status === "Completed") {
        db.query(
          'UPDATE prisoners SET enrollment_status = "Completed" WHERE id = (SELECT prisoner_id FROM enrolled_programs WHERE id = ?)',
          [req.params.id],
        );
      }
      res.json({ success: true });
    },
  );
});

app.delete("/api/enrollments/:id", isAdmin, (req, res) => {
  db.query(
    "DELETE FROM enrolled_programs WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

//  STAFF ROUTES - Admin only
app.get("/api/staff", isAdmin, (req, res) => {
  const { search, role, facility, status, page = 1, limit = 10 } = req.query;
  let query = "SELECT * FROM staff WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM staff WHERE 1=1";
  let params = [];

  if (search) {
    query += " AND (name LIKE ? OR email LIKE ?)";
    countQuery += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role && role !== "all") {
    query += " AND role = ?";
    countQuery += " AND role = ?";
    params.push(role);
  }
  if (facility && facility !== "all") {
    query += " AND facility = ?";
    countQuery += " AND facility = ?";
    params.push(facility);
  }
  if (status && status !== "all") {
    query += " AND employment_status = ?";
    countQuery += " AND employment_status = ?";
    params.push(status);
  }

  const offset = (page - 1) * limit;
  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.query(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ staff: results, total: countResult[0].total });
    });
  });
});

app.get("/api/staff/:id", isAdmin, (req, res) => {
  db.query(
    "SELECT * FROM staff WHERE id = ?",
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Staff not found" });
      res.json(results[0]);
    },
  );
});

app.post("/api/staff", isAdmin, upload.single("image"), (req, res) => {
  const { full_name, gender, age, education, prison, role } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const staff_id = `STF/${Date.now()}`;

  db.query(
    `INSERT INTO staff (staff_id, name, gender, age, education, facility, role, image_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [staff_id, full_name, gender, age, education, prison, role, image_url],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId, staff_id });
    },
  );
});

app.put("/api/staff/:id", isAdmin, (req, res) => {
  const { name, role, facility, employment_status } = req.body;
  db.query(
    "UPDATE staff SET name=?, role=?, facility=?, employment_status=? WHERE id=?",
    [name, role, facility, employment_status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

app.delete("/api/staff/:id", isAdmin, (req, res) => {
  db.query("DELETE FROM staff WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// SESSION ROUTES
app.post("/api/sessions", isAdminOrInstructor, (req, res) => {
  const { title, location, time, duration, coordinator, prisoner_id } =
    req.body;
  const sessionDateTime =
    time || new Date().toISOString().slice(0, 19).replace("T", " ");

  db.query(
    `INSERT INTO sessions (title, location, session_date, duration, coordinator, prisoner_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      location,
      sessionDateTime,
      duration,
      coordinator,
      prisoner_id || null,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    },
  );
});

app.get("/api/sessions", isAuthenticated, (req, res) => {
  const { prisoner_id, limit = 20 } = req.query;
  let query = `SELECT s.*, p.name as prisoner_name 
               FROM sessions s 
               LEFT JOIN prisoners p ON s.prisoner_id = p.id`;
  let params = [];

  if (prisoner_id) {
    query += " WHERE s.prisoner_id = ?";
    params.push(prisoner_id);
  }
  query += " ORDER BY s.session_date DESC LIMIT ?";
  params.push(parseInt(limit));

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.delete("/api/sessions/:id", isAdminOrInstructor, (req, res) => {
  db.query(
    "DELETE FROM sessions WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

//  FACILITY MANAGEMENT
app.get("/api/facilities", isAdmin, (req, res) => {
  db.query("SELECT * FROM facilities", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/facilities", isAdmin, (req, res) => {
  const { name, capacity, status } = req.body;
  db.query(
    "INSERT INTO facilities (name, capacity, status) VALUES (?, ?, ?)",
    [name, capacity, status],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    },
  );
});

app.put("/api/facilities/:id", isAdmin, (req, res) => {
  const { name, capacity, status } = req.body;
  db.query(
    "UPDATE facilities SET name=?, capacity=?, status=? WHERE id=?",
    [name, capacity, status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

app.delete("/api/facilities/:id", isAdmin, (req, res) => {
  db.query(
    "DELETE FROM facilities WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    },
  );
});

//  PASSWORD CHANGE ROUTE
app.post("/api/change-password", isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters long" });
  }

  db.query(
    "SELECT * FROM users WHERE id = ?",
    [userId],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "User not found" });

      const user = results[0];
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message: "Password changed successfully" });
        },
      );
    },
  );
});

//  PROGRAM STATS ENDPOINT
app.get("/api/programs/:id/stats", isAuthenticated, (req, res) => {
  const programId = req.params.id;

  db.query(
    `SELECT 
        COUNT(*) as enrolled_count,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
        AVG(completion_percentage) as avg_completion
     FROM enrolled_programs 
     WHERE program_id = ?`,
    [programId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        enrolled_count: results[0]?.enrolled_count || 0,
        completed_count: results[0]?.completed_count || 0,
        avg_completion: Math.round(results[0]?.avg_completion || 0),
      });
    },
  );
});

//  PROGRAM ENROLLMENTS ENDPOINT
app.get("/api/programs/:id/enrollments", isAuthenticated, (req, res) => {
  const programId = req.params.id;
  const userRole = req.session.role;
  const userId = req.session.userId;

  let query = `SELECT ep.*, p.name as prisoner_name, p.id_number 
               FROM enrolled_programs ep
               JOIN prisoners p ON ep.prisoner_id = p.id
               WHERE ep.program_id = ?`;
  let params = [programId];

  // For instructors, only show assigned prisoners
  if (userRole === "instructor") {
    query += ` AND p.id IN (SELECT prisoner_id FROM case_assignments WHERE user_id = ?)`;
    params.push(userId);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//  SERVE HTML PAGES
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/prisoners.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "prisoners.html"));
});

app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/programs.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "programs.html"));
});

app.get("/enrollments.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "enrollments.html"));
});

app.get("/sessions.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sessions.html"));
});

app.get("/staff.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "staff.html"));
});

app.get("/reports.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reports.html"));
});

app.get("/settings.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "settings.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Login with: admin / admin123`);
  console.log(`Instructor: instructor1 / admin123`);
  console.log(`Viewer: viewer1 / admin123`);
});
