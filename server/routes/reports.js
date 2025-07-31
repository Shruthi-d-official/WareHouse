const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get counting reports
router.get('/counting', [
  authenticateToken,
  authorizeRoles('admin', 'vendor', 'team_leader')
], async (req, res) => {
  try {
    const { startDate, endDate, whName } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT cl.*, bm.bin_name
      FROM counting_log cl
      JOIN bin_master bm ON cl.bin_id = bm.bin_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND cl.date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND cl.date <= $${paramCount}`;
      params.push(endDate);
    }

    if (whName) {
      paramCount++;
      query += ` AND cl.wh_name = $${paramCount}`;
      params.push(whName);
    }

    // Role-based filtering
    if (req.user.role === 'vendor') {
      paramCount++;
      query += ` AND cl.team_leader_name IN (
        SELECT tl.user_id FROM team_leaders tl WHERE tl.vendor_id = $${paramCount}
      )`;
      params.push(req.user.id);
    } else if (req.user.role === 'team_leader') {
      paramCount++;
      query += ` AND cl.team_leader_name = (
        SELECT user_id FROM team_leaders WHERE team_leader_id = $${paramCount}
      )`;
      params.push(req.user.id);
    }

    query += ' ORDER BY cl.created_at DESC';

    const result = await client.query(query, params);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get counting reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get performance reports
router.get('/performance', [
  authenticateToken,
  authorizeRoles('admin', 'vendor', 'team_leader')
], async (req, res) => {
  try {
    const { startDate, endDate, whName } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT *
      FROM performance_log
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      params.push(endDate);
    }

    if (whName) {
      paramCount++;
      query += ` AND wh_name = $${paramCount}`;
      params.push(whName);
    }

    // Role-based filtering
    if (req.user.role === 'vendor') {
      paramCount++;
      query += ` AND worker_username IN (
        SELECT w.user_id FROM workers w
        JOIN team_leaders tl ON w.team_leader_id = tl.team_leader_id
        WHERE tl.vendor_id = $${paramCount}
      )`;
      params.push(req.user.id);
    } else if (req.user.role === 'team_leader') {
      paramCount++;
      query += ` AND worker_username IN (
        SELECT w.user_id FROM workers w WHERE w.team_leader_id = $${paramCount}
      )`;
      params.push(req.user.id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await client.query(query, params);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get performance reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;