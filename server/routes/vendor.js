const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles, logAuditAction } = require('../middleware/auth');

const router = express.Router();

// Create team leader
router.post('/team-leaders', [
  authenticateToken,
  authorizeRoles('vendor'),
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
      'INSERT INTO team_leaders (vendor_id, user_id, password_hash) VALUES ($1, $2, $3) RETURNING team_leader_id, user_id',
      [req.user.id, userId, hashedPassword]
    );
    client.release();

    await logAuditAction(req, 'CREATE_TEAM_LEADER', `Created team leader: ${userId}`);

    res.status(201).json({
      message: 'Team leader created successfully',
      teamLeader: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'User ID already exists' });
    }
    console.error('Create team leader error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve team leader (one-time only)
router.post('/approve-team-leader', [
  authenticateToken,
  authorizeRoles('vendor'),
  body('teamLeaderId').isInt().withMessage('Valid team leader ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamLeaderId } = req.body;
    const client = await pool.connect();

    // Check if vendor has already approved a team leader
    const vendorCheck = await client.query(
      'SELECT approved_team_leader_id FROM vendors WHERE vendor_id = $1',
      [req.user.id]
    );

    if (vendorCheck.rows[0].approved_team_leader_id) {
      client.release();
      return res.status(400).json({ message: 'You have already approved a team leader' });
    }

    // Check if team leader belongs to this vendor
    const teamLeaderCheck = await client.query(
      'SELECT team_leader_id FROM team_leaders WHERE team_leader_id = $1 AND vendor_id = $2',
      [teamLeaderId, req.user.id]
    );

    if (teamLeaderCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Team leader not found or not authorized' });
    }

    // Approve team leader and update vendor record
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE team_leaders SET is_approved = true WHERE team_leader_id = $1',
      [teamLeaderId]
    );
    
    await client.query(
      'UPDATE vendors SET approved_team_leader_id = $1 WHERE vendor_id = $2',
      [teamLeaderId, req.user.id]
    );
    
    await client.query('COMMIT');
    client.release();

    await logAuditAction(req, 'APPROVE_TEAM_LEADER', `Approved team leader ID: ${teamLeaderId}`);

    res.json({ message: 'Team leader approved successfully' });
  } catch (error) {
    console.error('Approve team leader error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor's team leaders
router.get('/team-leaders', [
  authenticateToken,
  authorizeRoles('vendor')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT team_leader_id, user_id, is_approved, created_at FROM team_leaders WHERE vendor_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get team leaders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;