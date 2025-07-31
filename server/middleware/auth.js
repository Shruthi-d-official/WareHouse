const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

const logAuditAction = async (req, actionType, description) => {
  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO audit_log (user_role, user_id, action_type, description, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.user?.role || 'unknown', req.user?.userId || 'unknown', actionType, description, req.ip]
    );
    client.release();
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  logAuditAction
};