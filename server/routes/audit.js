const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get audit logs
router.get('/', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const { startDate, endDate, userRole, actionType } = req.query;
    const client = await pool.connect();
    
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND timestamp >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND timestamp <= $${paramCount}`;
      params.push(endDate);
    }

    if (userRole) {
      paramCount++;
      query += ` AND user_role = $${paramCount}`;
      params.push(userRole);
    }

    if (actionType) {
      paramCount++;
      query += ` AND action_type = $${paramCount}`;
      params.push(actionType);
    }

    query += ' ORDER BY timestamp DESC LIMIT 1000';

    const result = await client.query(query, params);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;