const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
const SALT_ROUNDS = 10;

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
app.use(express.json());

/* =========================
   HELPER: Standard JSON Response
========================= */
const sendSuccess = (res, data = null, message = "Success", status = 200) => {
  res.status(status).json({ success: true, message, data });
};

const sendError = (res, message = "Server error", status = 500, details = null) => {
  res.status(status).json({ success: false, message, details });
};

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  sendSuccess(res, null, "InternLink Backend is running 🚀");
});

/* =========================================================
   AUTH — STUDENT SIGNUP
========================================================= */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, college } = req.body;

    // Validation
    if (!name || !email || !password) {
      return sendError(res, "Name, email, and password are required", 400);
    }
    if (password.length < 6) {
      return sendError(res, "Password must be at least 6 characters", 400);
    }

    // Check duplicate email
    const [existing] = await db.query("SELECT UserID FROM Users WHERE Email = ?", [email]);
    if (existing.length > 0) {
      return sendError(res, "An account with this email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert
    const [result] = await db.query(
      "INSERT INTO Users (Name, Email, Password, Phone, College) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, phone || '', college || '']
    );

    sendSuccess(res, { userId: result.insertId }, "Account created successfully!", 201);
  } catch (err) {
    console.error("Signup error:", err);
    sendError(res, "Failed to create account");
  }
});

/* =========================================================
   AUTH — STUDENT LOGIN
========================================================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const [rows] = await db.query("SELECT * FROM Users WHERE Email = ?", [email]);

    if (rows.length === 0) {
      return sendError(res, "Invalid email or password", 401);
    }

    const user = rows[0];

    // Support both hashed and plaintext passwords (for backward compat)
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.Password);
    } catch {
      // If bcrypt fails, it might be a plaintext password from before
      passwordMatch = (password === user.Password);
      // If plaintext matched, upgrade to hashed
      if (passwordMatch) {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        await db.query("UPDATE Users SET Password = ? WHERE UserID = ?", [hashed, user.UserID]);
      }
    }

    if (!passwordMatch) {
      return sendError(res, "Invalid email or password", 401);
    }

    // Don't send password back
    const { Password, ...safeUser } = user;
    sendSuccess(res, safeUser, "Login successful");
  } catch (err) {
    console.error("Login error:", err);
    sendError(res, "Login failed");
  }
});

/* =========================================================
   AUTH — COMPANY SIGNUP
========================================================= */
app.post("/company-signup", async (req, res) => {
  try {
    const { name, email, password, industry, website, description } = req.body;

    if (!name || !email || !password) {
      return sendError(res, "Company name, email, and password are required", 400);
    }
    if (password.length < 6) {
      return sendError(res, "Password must be at least 6 characters", 400);
    }

    const [existing] = await db.query("SELECT CompanyID FROM Companies WHERE Email = ?", [email]);
    if (existing.length > 0) {
      return sendError(res, "A company with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await db.query(
      "INSERT INTO Companies (CompanyName, Email, Password, Industry, Website, Description) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, industry || '', website || '', description || '']
    );

    sendSuccess(res, { companyId: result.insertId }, "Company registered successfully!", 201);
  } catch (err) {
    console.error("Company signup error:", err);
    sendError(res, "Failed to register company");
  }
});

/* =========================================================
   AUTH — COMPANY LOGIN
========================================================= */
app.post("/company-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const [rows] = await db.query("SELECT * FROM Companies WHERE Email = ?", [email]);

    if (rows.length === 0) {
      return sendError(res, "Invalid email or password", 401);
    }

    const company = rows[0];

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, company.Password);
    } catch {
      passwordMatch = (password === company.Password);
      if (passwordMatch) {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        await db.query("UPDATE Companies SET Password = ? WHERE CompanyID = ?", [hashed, company.CompanyID]);
      }
    }

    if (!passwordMatch) {
      return sendError(res, "Invalid email or password", 401);
    }

    const { Password, ...safeCompany } = company;
    sendSuccess(res, safeCompany, "Login successful");
  } catch (err) {
    console.error("Company login error:", err);
    sendError(res, "Login failed");
  }
});

/* =========================================================
   INTERNSHIPS — LIST (with search/filter/sort)
========================================================= */
app.get("/internships", async (req, res) => {
  try {
    const { search, category, location, jobType, paymentType, sort } = req.query;

    let sql = `
      SELECT i.*, c.CompanyName 
      FROM Internships i 
      JOIN Companies c ON i.CompanyID = c.CompanyID 
      WHERE i.IsActive = TRUE
    `;
    const params = [];

    if (search) {
      sql += " AND (i.Title LIKE ? OR i.Description LIKE ? OR c.CompanyName LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (category) {
      sql += " AND i.Category = ?";
      params.push(category);
    }
    if (location) {
      sql += " AND i.Location LIKE ?";
      params.push(`%${location}%`);
    }
    if (jobType) {
      sql += " AND i.JobType = ?";
      params.push(jobType);
    }
    if (paymentType) {
      sql += " AND i.PaymentType = ?";
      params.push(paymentType);
    }

    // Sorting
    switch (sort) {
      case 'stipend_high': sql += " ORDER BY i.Stipend DESC"; break;
      case 'stipend_low': sql += " ORDER BY i.Stipend ASC"; break;
      case 'newest': sql += " ORDER BY i.CreatedAt DESC"; break;
      case 'deadline': sql += " ORDER BY i.Deadline ASC"; break;
      default: sql += " ORDER BY i.CreatedAt DESC";
    }

    const [rows] = await db.query(sql, params);
    sendSuccess(res, rows);
  } catch (err) {
    console.error("Fetch internships error:", err);
    sendError(res, "Failed to fetch internships");
  }
});

/* =========================================================
   INTERNSHIPS — GET CATEGORIES (for filter dropdown)
========================================================= */
app.get("/categories", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DISTINCT Category FROM Internships WHERE Category IS NOT NULL AND Category != '' ORDER BY Category");
    sendSuccess(res, rows.map(r => r.Category));
  } catch (err) {
    sendError(res, "Failed to fetch categories");
  }
});

/* =========================================================
   APPLICATIONS — APPLY
========================================================= */
app.post("/apply", async (req, res) => {
  try {
    const { userId, internshipId } = req.body;

    if (!userId || !internshipId) {
      return sendError(res, "User ID and Internship ID are required", 400);
    }

    // Check if already applied
    const [existing] = await db.query(
      "SELECT ApplicationID FROM Applications WHERE UserID = ? AND InternshipID = ?",
      [userId, internshipId]
    );
    if (existing.length > 0) {
      return sendError(res, "You have already applied for this internship", 409);
    }

    // Check internship exists and is active
    const [internship] = await db.query(
      "SELECT InternshipID FROM Internships WHERE InternshipID = ? AND IsActive = TRUE",
      [internshipId]
    );
    if (internship.length === 0) {
      return sendError(res, "This internship is no longer available", 404);
    }

    const [result] = await db.query(
      "INSERT INTO Applications (UserID, InternshipID, AppliedDate, Status, CompanySeen, UserSeen) VALUES (?, ?, CURDATE(), 'Applied', FALSE, TRUE)",
      [userId, internshipId]
    );

    sendSuccess(res, { applicationId: result.insertId }, "Applied successfully!", 201);
  } catch (err) {
    console.error("Apply error:", err);
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(res, "You have already applied for this internship", 409);
    }
    sendError(res, "Failed to apply");
  }
});

/* =========================================================
   APPLICATIONS — MY APPLICATIONS (Student)
========================================================= */
app.get("/my-applications/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const [rows] = await db.query(
      `SELECT a.ApplicationID, a.InternshipID, a.Status, a.UserSeen, a.AppliedDate, a.LastUpdated,
              i.Title, i.Location, i.Stipend, i.JobType, i.Duration,
              c.CompanyName
       FROM Applications a
       JOIN Internships i ON a.InternshipID = i.InternshipID
       JOIN Companies c ON i.CompanyID = c.CompanyID
       WHERE a.UserID = ?
       ORDER BY a.LastUpdated DESC`,
      [userId]
    );

    sendSuccess(res, rows);
  } catch (err) {
    console.error("Fetch applications error:", err);
    sendError(res, "Failed to fetch applications");
  }
});

/* =========================================================
   APPLICATIONS — USER'S APPLIED INTERNSHIP IDS (for badge)
========================================================= */
app.get("/user-applied-ids/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT InternshipID FROM Applications WHERE UserID = ? AND Status != 'Withdrawn'",
      [req.params.userId]
    );
    sendSuccess(res, rows.map(r => r.InternshipID));
  } catch (err) {
    sendError(res, "Failed to fetch applied IDs");
  }
});

/* =========================================================
   APPLICATIONS — WITHDRAW (Student)
========================================================= */
app.post("/withdraw-application/:id", async (req, res) => {
  try {
    const appId = req.params.id;

    const [existing] = await db.query(
      "SELECT ApplicationID, Status FROM Applications WHERE ApplicationID = ?",
      [appId]
    );
    if (existing.length === 0) {
      return sendError(res, "Application not found", 404);
    }
    if (existing[0].Status === 'Accepted') {
      return sendError(res, "Cannot withdraw an accepted application", 400);
    }

    await db.query(
      "UPDATE Applications SET Status = 'Withdrawn', UserSeen = TRUE, CompanySeen = FALSE WHERE ApplicationID = ?",
      [appId]
    );

    sendSuccess(res, null, "Application withdrawn successfully");
  } catch (err) {
    console.error("Withdraw error:", err);
    sendError(res, "Failed to withdraw application");
  }
});

/* =========================================================
   APPLICATIONS — COMPANY VIEW
========================================================= */
app.get("/company-applications/:companyId", async (req, res) => {
  try {
    const companyId = req.params.companyId;

    const [rows] = await db.query(
      `SELECT a.ApplicationID, a.Status, a.CompanySeen, a.AppliedDate, a.LastUpdated,
              i.Title, i.InternshipID,
              u.Name, u.Email, u.Phone, u.College, u.Skills
       FROM Applications a
       JOIN Internships i ON a.InternshipID = i.InternshipID
       JOIN Users u ON a.UserID = u.UserID
       WHERE i.CompanyID = ?
       ORDER BY a.LastUpdated DESC`,
      [companyId]
    );

    sendSuccess(res, rows);
  } catch (err) {
    console.error("Fetch company applications error:", err);
    sendError(res, "Failed to fetch applications");
  }
});

/* =========================================================
   APPLICATIONS — UPDATE STATUS (Company)
========================================================= */
app.post("/update-status", async (req, res) => {
  try {
    const { applicationId, status } = req.body;

    if (!applicationId || !status) {
      return sendError(res, "Application ID and status are required", 400);
    }

    const validStatuses = ['Applied', 'Shortlisted', 'Accepted', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const [existing] = await db.query("SELECT ApplicationID FROM Applications WHERE ApplicationID = ?", [applicationId]);
    if (existing.length === 0) {
      return sendError(res, "Application not found", 404);
    }

    await db.query(
      "UPDATE Applications SET Status = ?, UserSeen = FALSE WHERE ApplicationID = ?",
      [status, applicationId]
    );

    sendSuccess(res, null, `Status updated to ${status}`);
  } catch (err) {
    console.error("Update status error:", err);
    sendError(res, "Failed to update status");
  }
});

/* =========================================================
   NOTIFICATIONS — MARK SEEN
========================================================= */
app.post("/mark-seen", async (req, res) => {
  try {
    const { role, applicationId } = req.body;

    if (!role || !applicationId) {
      return sendError(res, "Role and application ID are required", 400);
    }

    const column = role === "company" ? "CompanySeen" : "UserSeen";

    await db.query(
      `UPDATE Applications SET ${column} = TRUE WHERE ApplicationID = ?`,
      [applicationId]
    );

    sendSuccess(res, null, "Marked as seen");
  } catch (err) {
    console.error("Mark seen error:", err);
    sendError(res, "Failed to mark as seen");
  }
});

/* =========================================================
   NOTIFICATIONS — MARK ALL SEEN
========================================================= */
app.post("/mark-all-seen", async (req, res) => {
  try {
    const { role, userId, companyId } = req.body;

    if (role === "user" && userId) {
      await db.query("UPDATE Applications SET UserSeen = TRUE WHERE UserID = ?", [userId]);
    } else if (role === "company" && companyId) {
      await db.query(
        `UPDATE Applications a 
         JOIN Internships i ON a.InternshipID = i.InternshipID 
         SET a.CompanySeen = TRUE 
         WHERE i.CompanyID = ?`,
        [companyId]
      );
    }

    sendSuccess(res, null, "All marked as seen");
  } catch (err) {
    sendError(res, "Failed to mark all as seen");
  }
});

/* =========================================================
   INTERNSHIPS — COMPANY MANAGEMENT (CRUD)
========================================================= */
// GET company internships
app.get("/company-internships/:companyId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, 
              (SELECT COUNT(*) FROM Applications WHERE InternshipID = i.InternshipID) AS ApplicationCount
       FROM Internships i 
       WHERE i.CompanyID = ? 
       ORDER BY i.CreatedAt DESC`,
      [req.params.companyId]
    );
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, "Failed to fetch internships");
  }
});

// ADD internship
app.post("/add-internship", async (req, res) => {
  try {
    const { title, companyId, location, category, duration, stipend, paymentType, jobType, description, skills, openings, deadline } = req.body;

    if (!title || !companyId) {
      return sendError(res, "Title and company are required", 400);
    }

    const [result] = await db.query(
      `INSERT INTO Internships (Title, CompanyID, Location, Category, Duration, Stipend, PaymentType, JobType, Description, Skills, Openings, Deadline) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, companyId, location || '', category || '', duration || '', stipend || 0, paymentType || 'Paid', jobType || 'Onsite', description || '', skills || '', openings || 1, deadline || null]
    );

    sendSuccess(res, { internshipId: result.insertId }, "Internship posted successfully!", 201);
  } catch (err) {
    console.error("Add internship error:", err);
    sendError(res, "Failed to add internship");
  }
});

// UPDATE internship
app.put("/update-internship/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { title, location, category, duration, stipend, paymentType, jobType, description, skills, openings, deadline, isActive } = req.body;

    const [existing] = await db.query("SELECT InternshipID FROM Internships WHERE InternshipID = ?", [id]);
    if (existing.length === 0) {
      return sendError(res, "Internship not found", 404);
    }

    await db.query(
      `UPDATE Internships SET Title=?, Location=?, Category=?, Duration=?, Stipend=?, PaymentType=?, JobType=?, Description=?, Skills=?, Openings=?, Deadline=?, IsActive=? 
       WHERE InternshipID=?`,
      [title, location, category, duration, stipend || 0, paymentType || 'Paid', jobType || 'Onsite', description, skills || '', openings || 1, deadline || null, isActive !== undefined ? isActive : true, id]
    );

    sendSuccess(res, null, "Internship updated successfully");
  } catch (err) {
    console.error("Update internship error:", err);
    sendError(res, "Failed to update internship");
  }
});

// DELETE internship (cascades to applications)
app.delete("/delete-internship/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const [existing] = await db.query("SELECT InternshipID FROM Internships WHERE InternshipID = ?", [id]);
    if (existing.length === 0) {
      return sendError(res, "Internship not found", 404);
    }

    // Delete related applications first (in case FK cascade isn't set up on existing table)
    await db.query("DELETE FROM Applications WHERE InternshipID = ?", [id]);
    await db.query("DELETE FROM Bookmarks WHERE InternshipID = ?", [id]);
    await db.query("DELETE FROM Internships WHERE InternshipID = ?", [id]);

    sendSuccess(res, null, "Internship deleted successfully");
  } catch (err) {
    console.error("Delete internship error:", err);
    sendError(res, "Failed to delete internship");
  }
});

/* =========================================================
   BOOKMARKS
========================================================= */
// Add bookmark
app.post("/bookmark", async (req, res) => {
  try {
    const { userId, internshipId } = req.body;

    if (!userId || !internshipId) {
      return sendError(res, "User ID and Internship ID are required", 400);
    }

    await db.query(
      "INSERT INTO Bookmarks (UserID, InternshipID) VALUES (?, ?)",
      [userId, internshipId]
    );

    sendSuccess(res, null, "Bookmark added", 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(res, "Already bookmarked", 409);
    }
    sendError(res, "Failed to add bookmark");
  }
});

// Remove bookmark
app.delete("/bookmark/:userId/:internshipId", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM Bookmarks WHERE UserID = ? AND InternshipID = ?",
      [req.params.userId, req.params.internshipId]
    );
    sendSuccess(res, null, "Bookmark removed");
  } catch (err) {
    sendError(res, "Failed to remove bookmark");
  }
});

// Get bookmarks
app.get("/bookmarks/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.BookmarkID, b.CreatedAt AS BookmarkedAt, 
              i.*, c.CompanyName
       FROM Bookmarks b
       JOIN Internships i ON b.InternshipID = i.InternshipID
       JOIN Companies c ON i.CompanyID = c.CompanyID
       WHERE b.UserID = ?
       ORDER BY b.CreatedAt DESC`,
      [req.params.userId]
    );
    sendSuccess(res, rows);
  } catch (err) {
    sendError(res, "Failed to fetch bookmarks");
  }
});

// Get bookmark IDs (for heart icon state)
app.get("/bookmark-ids/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT InternshipID FROM Bookmarks WHERE UserID = ?",
      [req.params.userId]
    );
    sendSuccess(res, rows.map(r => r.InternshipID));
  } catch (err) {
    sendError(res, "Failed to fetch bookmark IDs");
  }
});

/* =========================================================
   USER PROFILE
========================================================= */
// Get profile
app.get("/user-profile/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT UserID, Name, Email, Phone, College, Skills, Bio, CreatedAt FROM Users WHERE UserID = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      return sendError(res, "User not found", 404);
    }

    // Get stats
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) AS totalApplications,
        SUM(CASE WHEN Status = 'Accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN Status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
        SUM(CASE WHEN Status = 'Applied' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
       FROM Applications WHERE UserID = ?`,
      [req.params.id]
    );

    sendSuccess(res, { ...rows[0], stats: stats[0] });
  } catch (err) {
    sendError(res, "Failed to fetch profile");
  }
});

// Update profile
app.put("/update-profile/:id", async (req, res) => {
  try {
    const { name, phone, college, skills, bio } = req.body;

    const [existing] = await db.query("SELECT UserID FROM Users WHERE UserID = ?", [req.params.id]);
    if (existing.length === 0) {
      return sendError(res, "User not found", 404);
    }

    await db.query(
      "UPDATE Users SET Name = ?, Phone = ?, College = ?, Skills = ?, Bio = ? WHERE UserID = ?",
      [name, phone || '', college || '', skills || '', bio || '', req.params.id]
    );

    // Return updated user data
    const [updated] = await db.query(
      "SELECT UserID, Name, Email, Phone, College, Skills, Bio FROM Users WHERE UserID = ?",
      [req.params.id]
    );

    sendSuccess(res, updated[0], "Profile updated successfully");
  } catch (err) {
    console.error("Update profile error:", err);
    sendError(res, "Failed to update profile");
  }
});

/* =========================================================
   COMPANY STATS (Analytics Dashboard)
========================================================= */
app.get("/company-stats/:companyId", async (req, res) => {
  try {
    const companyId = req.params.companyId;

    const [internshipCount] = await db.query(
      "SELECT COUNT(*) AS total FROM Internships WHERE CompanyID = ?", [companyId]
    );
    const [activeCount] = await db.query(
      "SELECT COUNT(*) AS total FROM Internships WHERE CompanyID = ? AND IsActive = TRUE", [companyId]
    );
    const [appStats] = await db.query(
      `SELECT 
        COUNT(*) AS totalApplications,
        SUM(CASE WHEN a.Status = 'Applied' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN a.Status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
        SUM(CASE WHEN a.Status = 'Accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN a.Status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN a.CompanySeen = FALSE THEN 1 ELSE 0 END) AS unread
       FROM Applications a
       JOIN Internships i ON a.InternshipID = i.InternshipID
       WHERE i.CompanyID = ?`,
      [companyId]
    );

    sendSuccess(res, {
      totalInternships: internshipCount[0].total,
      activeInternships: activeCount[0].total,
      ...appStats[0]
    });
  } catch (err) {
    sendError(res, "Failed to fetch stats");
  }
});

/* =========================================================
   START SERVER
========================================================= */
app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 InternLink server running on port 5000");
});