const db = require('../config/db');

// ── GET ALL GROUPS ────────────────────────────────────────────────────────────
exports.getGroups = async (req, res) => {
  try {
    // Backticks added around groups to prevent reserved keyword conflicts
    const [groups] = await db.execute('SELECT * FROM `groups` ORDER BY id');
    for (const g of groups) {
      const [members] = await db.execute(
        `SELECT u.id, u.name, u.email
         FROM group_members gm JOIN users u ON u.id = gm.student_id
         WHERE gm.group_id = ?`, [g.id]
      );
      g.members = members;
    }
    res.json({ groups });
  } catch (err) {
    console.error("Error in getGroups:", err); // Prints the exact error to terminal
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET MY GROUP (student) ────────────────────────────────────────────────────
exports.getMyGroup = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT group_id FROM group_members WHERE student_id=?', [req.user.id]
    );
    if (!rows.length) return res.json({ group: null });

    const groupId = rows[0].group_id;
    const [grpRows] = await db.execute('SELECT * FROM `groups` WHERE id=?', [groupId]);
    if (!grpRows.length) return res.json({ group: null });

    const [members] = await db.execute(
      `SELECT u.id, u.name FROM group_members gm
       JOIN users u ON u.id=gm.student_id WHERE gm.group_id=?`, [groupId]
    );
    
    const grp = grpRows[0];
    grp.members = members;
    res.json({ group: grp });
  } catch (err) {
    console.error("Error in getMyGroup:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── CREATE GROUP ──────────────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
  try {
    const { name, section, member_ids } = req.body;
    if (!name || !member_ids?.length)
      return res.status(400).json({ message: 'Name and members required' });

    const [result] = await db.execute(
      'INSERT INTO `groups` (name, section, created_by) VALUES (?,?,?)',
      [name, section||null, req.user.id]
    );
    const groupId = result.insertId;

    for (const sid of member_ids) {
      await db.execute(
        'INSERT IGNORE INTO group_members (group_id, student_id) VALUES (?,?)',
        [groupId, sid]
      );
    }
    res.status(201).json({ message: 'Group created', group_id: groupId });
  } catch (err) {
    console.error("Error in createGroup:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── UPDATE GROUP ──────────────────────────────────────────────────────────────
exports.updateGroup = async (params, req, res) => {
  try {
    const { name, section, member_ids } = req.body;
    await db.execute('UPDATE `groups` SET name=?, section=? WHERE id=?',
      [name, section, req.params.id]);
    if (member_ids) {
      await db.execute('DELETE FROM group_members WHERE group_id=?', [req.params.id]);
      for (const sid of member_ids) {
        await db.execute('INSERT IGNORE INTO group_members (group_id,student_id) VALUES (?,?)',
          [req.params.id, sid]);
      }
    }
    res.json({ message: 'Group updated' });
  } catch (err) {
    console.error("Error in updateGroup:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE GROUP ──────────────────────────────────────────────────────────────
exports.deleteGroup = async (req, res) => {
  try {
    await db.execute('DELETE FROM `groups` WHERE id=?', [req.params.id]);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error("Error in deleteGroup:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── SUBMIT PEER EVALUATION ────────────────────────────────────────────────────
exports.submitEvaluation = async (req, res) => {
  try {
    const { evaluations } = req.body;
    for (const ev of evaluations) {
      await db.execute(
        `INSERT INTO peer_evaluations (evaluator_id,evaluatee_id,group_id,rating,comment)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)`,
        [req.user.id, ev.evaluatee_id, ev.group_id, ev.rating, ev.comment||null]
      );
    }
    res.json({ message: 'Evaluation submitted' });
  } catch (err) {
    console.error("Error in submitEvaluation:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET EVALUATION RESULTS (instructor) ──────────────────────────────────────
exports.getResults = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT pe.*, u1.name AS evaluator_name, u2.name AS evaluatee_name, g.name AS group_name
       FROM peer_evaluations pe
       JOIN users u1 ON u1.id=pe.evaluator_id
       JOIN users u2 ON u2.id=pe.evaluatee_id
       JOIN \`groups\` g ON g.id=pe.group_id
       ORDER BY g.id, u2.name`
    );
    res.json({ results: rows });
  } catch (err) {
    console.error("Error in getResults:", err);
    res.status(500).json({ message: 'Server error' });
  }
};
