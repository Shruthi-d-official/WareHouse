const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'warehouse.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create tables
      db.run(`CREATE TABLE IF NOT EXISTS admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS vendors (
        vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES admins(admin_id) ON DELETE CASCADE,
        user_id TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        approved_team_leader_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS team_leaders (
        team_leader_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER REFERENCES vendors(vendor_id) ON DELETE CASCADE,
        user_id TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_approved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS workers (
        worker_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_leader_id INTEGER REFERENCES team_leaders(team_leader_id) ON DELETE CASCADE,
        user_id TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT NOT NULL,
        is_approved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS bin_master (
        bin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        bin_name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS otp_log (
        otp_id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id INTEGER REFERENCES workers(worker_id) ON DELETE CASCADE,
        otp_code TEXT NOT NULL,
        expiry_time DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS counting_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        wh_name TEXT NOT NULL,
        date DATE NOT NULL,
        team_leader_name TEXT NOT NULL,
        worker_username TEXT NOT NULL,
        bin_id INTEGER REFERENCES bin_master(bin_id),
        qty_counted INTEGER NOT NULL,
        qty_recounted INTEGER DEFAULT NULL,
        qty_as_per_books INTEGER DEFAULT NULL,
        difference INTEGER DEFAULT NULL,
        reason_for_difference TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS performance_log (
        performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        wh_name TEXT NOT NULL,
        date DATE NOT NULL,
        worker_username TEXT NOT NULL,
        no_of_bins_counted INTEGER NOT NULL,
        no_of_qty_counted INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        efficiency REAL DEFAULT NULL,
        ranking INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS audit_log (
        action_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_role TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        description TEXT NOT NULL,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Insert default admin (password is 'password')
      db.run(`INSERT OR IGNORE INTO admins (user_id, password_hash) 
              VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')`);

      // Insert sample bins
      const bins = ['BIN-001', 'BIN-002', 'BIN-003', 'BIN-004', 'BIN-005',
                   'BIN-006', 'BIN-007', 'BIN-008', 'BIN-009', 'BIN-010'];
      
      bins.forEach(binName => {
        db.run(`INSERT OR IGNORE INTO bin_master (bin_name) VALUES (?)`, [binName]);
      });

      resolve();
    });
  });
};

// Create a pool-like interface for compatibility
const pool = {
  connect: () => {
    return Promise.resolve({
      query: (sql, params = []) => {
        return new Promise((resolve, reject) => {
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
              if (err) reject(err);
              else resolve({ rows });
            });
          } else {
            db.run(sql, params, function(err) {
              if (err) reject(err);
              else resolve({ rows: [{ [Object.keys(this)[0]]: this.lastID }] });
            });
          }
        });
      },
      release: () => {
        // No-op for SQLite
      }
    });
  }
};

// Initialize database on startup
initializeDatabase().then(() => {
  console.log('SQLite database initialized successfully');
}).catch(err => {
  console.error('Database initialization error:', err);
});

module.exports = pool;