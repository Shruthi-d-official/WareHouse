const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles, logAuditAction } = require('../middleware/auth');

const router = express.Router();

// Create worker
router.post('/workers', [
  authenticateToken,
  authorizeRoles('team_leader'),
  body('userId').trim().isLength({ min: 1 }).withMessage('User ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO workers (team_leader_id, user_id, password_hash, email) VALUES ($1, $2, $3, $4) RETURNING worker_id, user_id, email',
      [req.user.id, userId, hashedPassword, email]
    );
    client.release();

    await logAuditAction(req, 'CREATE_WORKER', `Created worker: ${userId}`);

    res.status(201).json({
      message: 'Worker created successfully',
      worker: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'User ID or email already exists' });
    }
    console.error('Create worker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve worker OTP
router.post('/approve-otp', [
  authenticateToken,
  authorizeRoles('team_leader'),
  body('workerId').isInt().withMessage('Valid worker ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { workerId } = req.body;
    const client = await pool.connect();

    // Check if worker belongs to this team leader
    const workerCheck = await client.query(
      'SELECT worker_id FROM workers WHERE worker_id = $1 AND team_leader_id = $2',
      [workerId, req.user.id]
    );

    if (workerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Worker not found or not authorized' });
    }

    // Approve worker
    await client.query(
      'UPDATE workers SET is_approved = true WHERE worker_id = $1',
      [workerId]
    );
    
    client.release();

    await logAuditAction(req, 'APPROVE_WORKER', `Approved worker ID: ${workerId}`);

    res.json({ message: 'Worker approved successfully' });
  } catch (error) {
    console.error('Approve worker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get team leader's workers
router.get('/workers', [
  authenticateToken,
  authorizeRoles('team_leader')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT worker_id, user_id, email, is_approved, created_at FROM workers WHERE team_leader_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending OTPs for approval
router.get('/pending-otps', [
  authenticateToken,
  authorizeRoles('team_leader')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT o.otp_id, o.worker_id, o.otp_code, o.created_at,
             w.user_id as worker_user_id, w.email
      FROM otp_log o
      JOIN workers w ON o.worker_id = w.worker_id
      WHERE w.team_leader_id = $1 AND o.status = 'pending' AND o.expiry_time > NOW()
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending OTPs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;