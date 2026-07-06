const jwt = require('jsonwebtoken');
const db  = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token provided' });

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.execute(
      'SELECT id, name, email, role, year, section, department, profile_pic FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ message: 'User not found' });

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const instructorOnly = (req, res, next) => {
  if (req.user?.role !== 'instructor')
    return res.status(403).json({ message: 'Instructor access required' });
  next();
};

const studentOnly = (req, res, next) => {
  if (req.user?.role !== 'student')
    return res.status(403).json({ message: 'Student access required' });
  next();
};

module.exports = { protect, instructorOnly, studentOnly };
