const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const { cloudinary } = require('../config/cloudinary');


// Update profile 
exports.updateProfile = async (req, res) => {
  try {
    // 1. Extract fields, fallback to null instead of letting them be undefined
    const name = req.body.name !== undefined ? req.body.name : null;
    const department = req.body.department !== undefined ? req.body.department : null;
    const year = req.body.year !== undefined ? req.body.year : null;
    const section = req.body.section !== undefined ? req.body.section : null;

    // 2. Run the update safely
    await db.execute(
      'UPDATE users SET name=?, department=?, year=?, section=? WHERE id=?',
      [name, department, year, section, req.user.id]
    );

    // 3. Fetch the updated user data
    const [rows] = await db.execute(
      'SELECT id, name, email, role, year, section, department, profile_pic FROM users WHERE id=?',
      [req.user.id]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.log('database error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = req.file.path;
    await db.execute('UPDATE users SET profile_pic=? WHERE id=?', [url, req.user.id]);
    res.json({ profile_pic: url });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET ALL STUDENTS (instructor) ─────────────────────────────────────────────
exports.getStudents = async (req, res) => {
  try {
    const { section } = req.query;
    let sql = `
      SELECT u.id, u.name, u.email, u.year, u.section, u.profile_pic,
             MAX(qa.percentage) AS quiz_score,
             ROUND(AVG(qa.percentage),1) AS avg_score,
             COUNT(DISTINCT s.id) AS submissions
      FROM users u
      LEFT JOIN quiz_attempts qa ON qa.student_id = u.id
      LEFT JOIN submissions s ON s.student_id = u.id
      WHERE u.role = 'student'`;
    const params = [];
    if (section) { sql += ' AND u.section = ?'; params.push(section); }
    sql += ' GROUP BY u.id ORDER BY u.section, u.name';
    const [rows] = await db.execute(sql, params);
    res.json({ students: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── UPDATE STUDENT SCORE ──────────────────────────────────────────────────────
exports.updateStudentScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    // insert a manual override attempt record
    await db.execute(
      'INSERT INTO quiz_attempts (student_id,submitted_at,score,total,percentage) VALUES (?,NOW(),?,100,?) ON DUPLICATE KEY UPDATE percentage=?',
      [id, score, score, score]
    );
    res.json({ message: 'Score updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── IMPORT STUDENTS VIA EXCEL ─────────────────────────────────────────────────
exports.importStudents = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const bcrypt = require('bcryptjs');
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws  = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    const defaultPassword = await bcrypt.hash('ccs2024!', 10);
    const created = [];

    for (const row of rows) {
      const name    = row['Name']    || row['name'];
      const email   = row['Email']   || row['email'];
      const year    = row['Year']    || row['year'];
      const section = row['Section'] || row['section'];
      if (!name || !email) continue;

      const [exists] = await db.execute('SELECT id FROM users WHERE email=?', [email]);
      if (exists.length) continue;

      const [result] = await db.execute(
        'INSERT INTO users (name,email,password,role,year,section) VALUES (?,?,?,\'student\',?,?)',
        [name, email.toLowerCase(), defaultPassword, year, section]
      );
      created.push({ id: result.insertId, name, email, year, section, defaultPassword: 'ccs2024!' });
    }

    res.json({ message: `${created.length} accounts created`, students: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Import failed' });
  }
};

exports.delStudent = async function (req, res) {
  try {
    var id = req.params.id;

    // 1. Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // 2. Fetch and validate target user
    var [rows] = await db.execute('SELECT id, name, role FROM users WHERE id=?', [id]);
    if (!rows || !rows.length) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Fixed: Added [0] index to rows
    if (rows[0].role !== 'student') {
      return res.status(403).json({ message: 'Can only delete students' });
    }

    // 3. Clear records that would otherwise conflict with constraints
    await db.execute('DELETE FROM peer_evaluations WHERE evaluator_id=? OR evaluatee_id=?', [id, id]);
    await db.execute('DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE student_id=?)', [id]);
    
    // 4. Final delete (Triggers ON DELETE CASCADE for quiz_attempts, submissions, and group_members automatically)
    await db.execute('DELETE FROM users WHERE id=?', [id]);

    res.json({ message: 'Student "' + rows[0].name + '" deleted successfully' });
  } catch (e) {
    console.error('Detailed Delete Error:', e); // Prints the entire error stack for cleaner debugging
    res.status(500).json({ message: 'Failed to delete student: ' + e.message });
  }
}