const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles, logAuditAction } = require('../middleware/auth');

const router = express.Router();

// Create vendor
router.post('/vendors', [
  authenticateToken,
  authorizeRoles('admin'),
  body('userId').trim().isLength({ min: 1 }).withMessage('User ID is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO vendors (admin_id, user_id, password_hash) VALUES ($1, $2, $3) RETURNING vendor_id, user_id',
      [req.user.id, userId, hashedPassword]
    );
    client.release();

    await logAuditAction(req, 'CREATE_VENDOR', `Created vendor: ${userId}`);

    res.status(201).json({
      message: 'Vendor created successfully',
      vendor: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'User ID already exists' });
    }
    console.error('Create vendor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all vendors
router.get('/vendors', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT vendor_id, user_id, approved_team_leader_id, created_at FROM vendors ORDER BY created_at DESC'
    );
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all team leaders
router.get('/team-leaders', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT tl.team_leader_id, tl.user_id, tl.is_approved, tl.created_at,
             v.user_id as vendor_user_id
      FROM team_leaders tl
      JOIN vendors v ON tl.vendor_id = v.vendor_id
      ORDER BY tl.created_at DESC
    `);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get team leaders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all workers
router.get('/workers', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT w.worker_id, w.user_id, w.email, w.is_approved, w.created_at,
             tl.user_id as team_leader_user_id
      FROM workers w
      JOIN team_leaders tl ON w.team_leader_id = tl.team_leader_id
      ORDER BY w.created_at DESC
    `);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;