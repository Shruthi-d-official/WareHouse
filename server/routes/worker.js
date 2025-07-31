const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get worker profile
router.get('/profile', [
  authenticateToken,
  authorizeRoles('worker')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT worker_id, user_id, email, is_approved FROM workers WHERE worker_id = $1',
      [req.user.id]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get worker profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;