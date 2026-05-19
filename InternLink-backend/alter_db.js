const db = require('./db');

const alterQueries = [
  "ALTER TABLE Applications ADD COLUMN CompanySeen BOOLEAN DEFAULT FALSE;",
  "ALTER TABLE Applications ADD COLUMN UserSeen BOOLEAN DEFAULT TRUE;",
  "ALTER TABLE Applications ADD COLUMN LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
];

const runQueries = async () => {
  for (let query of alterQueries) {
    try {
      await new Promise((resolve, reject) => {
        db.query(query, (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
              console.log(`Column already exists, skipping: ${query}`);
              resolve();
            } else {
              reject(err);
            }
          } else {
            console.log(`Successfully executed: ${query}`);
            resolve();
          }
        });
      });
    } catch (e) {
      console.error(`Error executing ${query}:`, e);
    }
  }
  console.log("Database altered. Exiting.");
  process.exit();
};

runQueries();
