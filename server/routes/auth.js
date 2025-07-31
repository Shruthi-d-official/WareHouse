const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { sendOTP } = require('../utils/email');
const { logAuditAction } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('userId').trim().isLength({ min: 1 }).withMessage('User ID is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  body('role').isIn(['admin', 'vendor', 'team_leader', 'worker']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, password, role } = req.body;
    const client = await pool.connect();

    let query, table;
    switch (role) {
      case 'admin':
        table = 'admins';
        query = 'SELECT admin_id as id, user_id, password_hash FROM admins WHERE user_id = $1';
        break;
      case 'vendor':
        table = 'vendors';
        query = 'SELECT vendor_id as id, user_id, password_hash FROM vendors WHERE user_id = $1';
        break;
      case 'team_leader':
        table = 'team_leaders';
        query = 'SELECT team_leader_id as id, user_id, password_hash, is_approved FROM team_leaders WHERE user_id = $1';
        break;
      case 'worker':
        table = 'workers';
        query = 'SELECT worker_id as id, user_id, password_hash, email, is_approved FROM workers WHERE user_id = $1';
        break;
    }

    const result = await client.query(query, [userId]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check approval status for team leaders and workers
    if ((role === 'team_leader' || role === 'worker') && !user.is_approved) {
      return res.status(403).json({ message: 'Account not approved yet' });
    }

    // For workers, send OTP
    if (role === 'worker') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const client2 = await pool.connect();
      await client2.query(
        'INSERT INTO otp_log (worker_id, otp_code, expiry_time) VALUES ($1, $2, $3)',
        [user.id, otpCode, expiryTime]
      );
      client2.release();

      await sendOTP(user.email, otpCode);
      
      return res.json({ 
        message: 'OTP sent to your email. Please verify to complete login.',
        requiresOTP: true,
        workerId: user.id
      });
    }

    const token = jwt.sign(
      { userId: user.user_id, role, id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
      user: {
        id: user.id,
        userId: user.user_id,
        role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
  try {
    const { workerId } = req.body;
    const client = await pool.connect();
    
    const workerResult = await client.query(
      'SELECT email FROM workers WHERE worker_id = $1',
      [workerId]
    );

    if (workerResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Worker not found' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

    await client.query(
      'INSERT INTO otp_log (worker_id, otp_code, expiry_time) VALUES ($1, $2, $3)',
      [workerId, otpCode, expiryTime]
    );
    
    client.release();

    await sendOTP(workerResult.rows[0].email, otpCode);
    
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { workerId, otpCode } = req.body;
    const client = await pool.connect();

    const otpResult = await client.query(
      'SELECT * FROM otp_log WHERE worker_id = $1 AND otp_code = $2 AND status = $3 AND expiry_time > NOW() ORDER BY created_at DESC LIMIT 1',
      [workerId, otpCode, 'pending']
    );

    if (otpResult.rows.length === 0) {
      client.release();
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update OTP status to approved
    await client.query(
      'UPDATE otp_log SET status = $1 WHERE otp_id = $2',
      ['approved', otpResult.rows[0].otp_id]
    );

    // Get worker details
    const workerResult = await client.query(
      'SELECT worker_id, user_id FROM workers WHERE worker_id = $1',
      [workerId]
    );

    client.release();

    const worker = workerResult.rows[0];
    const token = jwt.sign(
      { userId: worker.user_id, role: 'worker', id: worker.worker_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
      user: {
        id: worker.worker_id,
        userId: worker.user_id,
        role: 'worker'
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;