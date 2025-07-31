-- Database Schema for Warehouse Management System

-- Create database (run this separately)
-- CREATE DATABASE warehouse_db;

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(admin_id) ON DELETE CASCADE,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    approved_team_leader_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Leaders table
CREATE TABLE IF NOT EXISTS team_leaders (
    team_leader_id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
    worker_id SERIAL PRIMARY KEY,
    team_leader_id INTEGER REFERENCES team_leaders(team_leader_id) ON DELETE CASCADE,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bin Master table
CREATE TABLE IF NOT EXISTS bin_master (
    bin_id SERIAL PRIMARY KEY,
    bin_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Log table
CREATE TABLE IF NOT EXISTS otp_log (
    otp_id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES workers(worker_id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expiry_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counting Log table (Detailed Counting Data)
CREATE TABLE IF NOT EXISTS counting_log (
    log_id SERIAL PRIMARY KEY,
    wh_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    team_leader_name VARCHAR(100) NOT NULL,
    worker_username VARCHAR(50) NOT NULL,
    bin_id INTEGER REFERENCES bin_master(bin_id),
    qty_counted INTEGER NOT NULL,
    qty_recounted INTEGER DEFAULT NULL,
    qty_as_per_books INTEGER DEFAULT NULL,
    difference INTEGER DEFAULT NULL,
    reason_for_difference TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Log table (Worker Performance Data)
CREATE TABLE IF NOT EXISTS performance_log (
    performance_id SERIAL PRIMARY KEY,
    wh_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    worker_username VARCHAR(50) NOT NULL,
    no_of_bins_counted INTEGER NOT NULL,
    no_of_qty_counted INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    efficiency DECIMAL(5,2) DEFAULT NULL,
    ranking INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_log (
    action_id SERIAL PRIMARY KEY,
    user_role VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin
INSERT INTO admins (user_id, password_hash) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi') 
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample bins
INSERT INTO bin_master (bin_name) VALUES 
('BIN-001'), ('BIN-002'), ('BIN-003'), ('BIN-004'), ('BIN-005'),
('BIN-006'), ('BIN-007'), ('BIN-008'), ('BIN-009'), ('BIN-010')
ON CONFLICT (bin_name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_admin_id ON vendors(admin_id);
CREATE INDEX IF NOT EXISTS idx_team_leaders_vendor_id ON team_leaders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_workers_team_leader_id ON workers(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_counting_log_date ON counting_log(date);
CREATE INDEX IF NOT EXISTS idx_performance_log_date ON performance_log(date);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);