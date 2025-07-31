const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles, logAuditAction } = require('../middleware/auth');

const router = express.Router();

// Get all bins
router.get('/bins', [
  authenticateToken,
  authorizeRoles('worker', 'team_leader', 'vendor', 'admin')
], async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT bin_id, bin_name FROM bin_master ORDER BY bin_name'
    );
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get bins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start counting session
router.post('/start', [
  authenticateToken,
  authorizeRoles('worker'),
  body('whName').trim().isLength({ min: 1 }).withMessage('Warehouse name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { whName } = req.body;
    const startTime = new Date();

    // Store session in memory or database as needed
    // For now, we'll just return the start time
    
    await logAuditAction(req, 'START_COUNTING', `Started counting session in ${whName}`);

    res.json({
      message: 'Counting session started',
      startTime,
      whName
    });
  } catch (error) {
    console.error('Start counting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add counting entry
router.post('/entry', [
  authenticateToken,
  authorizeRoles('worker'),
  body('whName').trim().isLength({ min: 1 }).withMessage('Warehouse name is required'),
  body('binId').isInt().withMessage('Valid bin ID is required'),
  body('qtyCounted').isInt({ min: 0 }).withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { whName, binId, qtyCounted } = req.body;
    const client = await pool.connect();

    // Get team leader name
    const teamLeaderResult = await client.query(`
      SELECT tl.user_id as team_leader_name
      FROM workers w
      JOIN team_leaders tl ON w.team_leader_id = tl.team_leader_id
      WHERE w.worker_id = $1
    `, [req.user.id]);

    const teamLeaderName = teamLeaderResult.rows[0]?.team_leader_name || 'Unknown';

    const result = await client.query(
      'INSERT INTO counting_log (wh_name, date, team_leader_name, worker_username, bin_id, qty_counted) VALUES ($1, $2, $3, $4, $5, $6) RETURNING log_id',
      [whName, new Date().toISOString().split('T')[0], teamLeaderName, req.user.userId, binId, qtyCounted]
    );
    
    client.release();

    await logAuditAction(req, 'ADD_COUNTING_ENTRY', `Added counting entry for bin ${binId}, qty: ${qtyCounted}`);

    res.status(201).json({
      message: 'Counting entry added successfully',
      logId: result.rows[0].log_id
    });
  } catch (error) {
    console.error('Add counting entry error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End counting session
router.post('/end', [
  authenticateToken,
  authorizeRoles('worker'),
  body('whName').trim().isLength({ min: 1 }).withMessage('Warehouse name is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { whName, startTime } = req.body;
    const endTime = new Date();
    const start = new Date(startTime);
    const client = await pool.connect();

    // Get counting data for this session
    const countingResult = await client.query(`
      SELECT COUNT(*) as bins_counted, SUM(qty_counted) as total_qty
      FROM counting_log
      WHERE worker_username = $1 AND wh_name = $2 AND date = $3
    `, [req.user.userId, whName, new Date().toISOString().split('T')[0]]);

    const { bins_counted, total_qty } = countingResult.rows[0];
    const timeTakenHours = (endTime - start) / (1000 * 60 * 60);
    const efficiency = timeTakenHours > 0 ? (parseInt(bins_counted) / timeTakenHours).toFixed(2) : 0;

    // Insert performance log
    await client.query(
      'INSERT INTO performance_log (wh_name, date, worker_username, no_of_bins_counted, no_of_qty_counted, start_time, end_time, efficiency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [whName, new Date().toISOString().split('T')[0], req.user.userId, bins_counted, total_qty || 0, start, endTime, efficiency]
    );

    client.release();

    await logAuditAction(req, 'END_COUNTING', `Ended counting session in ${whName}, bins: ${bins_counted}, qty: ${total_qty}`);

    res.json({
      message: 'Counting session ended successfully',
      summary: {
        binsCount: bins_counted,
        totalQty: total_qty || 0,
        timeTaken: timeTakenHours.toFixed(2) + ' hours',
        efficiency: efficiency + ' bins/hour'
      }
    });
  } catch (error) {
    console.error('End counting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;