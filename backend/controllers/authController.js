const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const nodemailer  = require('nodemailer');
const db          = require('../config/db');
require('dotenv').config();
const signToken = require('../controllers/token/signToken')

const JWT = process.env.JWT_SECRET || 'mms_code_12345'

//login - student || instructor 
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()] 
      // Added .trim() to be safe
    );

    // User not found — count as failed attempt
    if (!rows.length) {
      if (req.bruteForce) await req.bruteForce.onFailure();
      return res.status(401).json({
        message: 'Invalid credentials',
        attemptsRemaining: req.bruteForce
          ? req.bruteForce.attemptsRemaining - 1
          : undefined,
      });
    }

    const user = rows[0];


    const valid = await bcrypt.compare(password, user.password);


    // Wrong password — count as failed attempt
    if (!valid) {
      if (req.bruteForce) await req.bruteForce.onFailure();
      const remaining = req.bruteForce
        ? req.bruteForce.attemptsRemaining - 1
        : undefined;

      return res.status(401).json({
        message: remaining !== undefined && remaining <= 3
          ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} left before lockout.`
          : 'Invalid credentials',
        attemptsRemaining: remaining,
      });
    }

    // ── SUCCESS — reset brute force counter ───────────────────────────────────
    if (req.bruteForce) await req.bruteForce.onSuccess();

    const token = signToken(user.id, user.role);
    const { password: _, reset_token: __, reset_expiry: ___, ...safe } = user;


    res.json({ token, user: safe });
  } catch (err) {
    console.error(' Server Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


//forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? OR gmail = ?', [email, email]);
    if (!rows.length) return res.status(404).json({ message: 'No account found with this email' });

    const user  = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_expiry = ? WHERE id = ?',
      [token, expiry, user.id]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'MMS – Password Reset',
      html: `<h2>MMS Password Reset</h2>
             <p>Click the link below to reset your password (valid for 1 hour):</p>
             <a href="${resetUrl}">${resetUrl}</a>`,
    });

    res.json({ message: 'Reset link sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not send email. Try again.' });
  }
};

//password reset
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE reset_token = ? AND reset_expiry > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?',
      [hashed, rows[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// password change
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};  

//register for instructor
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Hash the password using the bcryptjs library currently in your node_modules
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase().trim(), hashedPassword, role || 'instructor']
    );

    res.status(201).json({ message: 'User created! You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
};


//get me
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
