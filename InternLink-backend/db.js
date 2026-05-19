require('dotenv').config();
const mysql = require('mysql2');

/* =========================
   CONNECTION POOL
========================= */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Dhanush@123',
  database: process.env.DB_NAME || 'InternLink',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = pool.promise();

/* =========================
   SCHEMA INITIALIZATION
========================= */
const initSchema = async () => {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS Users (
      UserID INT AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(100) NOT NULL,
      Email VARCHAR(150) UNIQUE NOT NULL,
      Password VARCHAR(255) NOT NULL,
      Phone VARCHAR(20) DEFAULT '',
      College VARCHAR(200) DEFAULT '',
      Skills TEXT,
      Bio TEXT,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Companies table
    `CREATE TABLE IF NOT EXISTS Companies (
      CompanyID INT AUTO_INCREMENT PRIMARY KEY,
      CompanyName VARCHAR(150) NOT NULL,
      Email VARCHAR(150) UNIQUE NOT NULL,
      Password VARCHAR(255) NOT NULL,
      Industry VARCHAR(100) DEFAULT '',
      Website VARCHAR(255) DEFAULT '',
      Description TEXT,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Internships table
    `CREATE TABLE IF NOT EXISTS Internships (
      InternshipID INT AUTO_INCREMENT PRIMARY KEY,
      Title VARCHAR(200) NOT NULL,
      CompanyID INT NOT NULL,
      Location VARCHAR(150) DEFAULT '',
      Category VARCHAR(100) DEFAULT '',
      Duration VARCHAR(50) DEFAULT '',
      Stipend INT DEFAULT 0,
      PaymentType VARCHAR(20) DEFAULT 'Paid',
      JobType VARCHAR(20) DEFAULT 'Onsite',
      Description TEXT,
      Skills VARCHAR(500) DEFAULT '',
      Openings INT DEFAULT 1,
      Deadline DATE,
      IsActive BOOLEAN DEFAULT TRUE,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID) ON DELETE CASCADE
    )`,

    // Applications table
    `CREATE TABLE IF NOT EXISTS Applications (
      ApplicationID INT AUTO_INCREMENT PRIMARY KEY,
      UserID INT NOT NULL,
      InternshipID INT NOT NULL,
      AppliedDate DATE NOT NULL,
      Status VARCHAR(20) DEFAULT 'Applied',
      CompanySeen BOOLEAN DEFAULT FALSE,
      UserSeen BOOLEAN DEFAULT TRUE,
      LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
      FOREIGN KEY (InternshipID) REFERENCES Internships(InternshipID) ON DELETE CASCADE,
      UNIQUE KEY unique_application (UserID, InternshipID)
    )`,

    // Bookmarks table
    `CREATE TABLE IF NOT EXISTS Bookmarks (
      BookmarkID INT AUTO_INCREMENT PRIMARY KEY,
      UserID INT NOT NULL,
      InternshipID INT NOT NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
      FOREIGN KEY (InternshipID) REFERENCES Internships(InternshipID) ON DELETE CASCADE,
      UNIQUE KEY unique_bookmark (UserID, InternshipID)
    )`
  ];

  // Columns to safely add if they don't already exist
  const alterQueries = [
    "ALTER TABLE Users ADD COLUMN Phone VARCHAR(20) DEFAULT ''",
    "ALTER TABLE Users ADD COLUMN College VARCHAR(200) DEFAULT ''",
    "ALTER TABLE Users ADD COLUMN Skills TEXT",
    "ALTER TABLE Users ADD COLUMN Bio TEXT",
    "ALTER TABLE Companies ADD COLUMN Industry VARCHAR(100) DEFAULT ''",
    "ALTER TABLE Companies ADD COLUMN Website VARCHAR(255) DEFAULT ''",
    "ALTER TABLE Companies ADD COLUMN Description TEXT",
    "ALTER TABLE Internships ADD COLUMN Skills VARCHAR(500) DEFAULT ''",
    "ALTER TABLE Internships ADD COLUMN Openings INT DEFAULT 1",
    "ALTER TABLE Internships ADD COLUMN Deadline DATE",
    "ALTER TABLE Internships ADD COLUMN IsActive BOOLEAN DEFAULT TRUE",
    "ALTER TABLE Applications ADD COLUMN CompanySeen BOOLEAN DEFAULT FALSE",
    "ALTER TABLE Applications ADD COLUMN UserSeen BOOLEAN DEFAULT TRUE",
    "ALTER TABLE Applications ADD COLUMN LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  ];

  try {
    for (const sql of tables) {
      await db.query(sql);
    }
    console.log("✅ All tables initialized successfully");

    for (const sql of alterQueries) {
      try {
        await db.query(sql);
      } catch (err) {
        // Ignore duplicate column errors
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.error("Alter warning:", err.message);
        }
      }
    }
    console.log("✅ Schema migration complete");
  } catch (err) {
    console.error("❌ Schema initialization failed:", err.message);
  }
};

// Run on startup
initSchema();

module.exports = db;