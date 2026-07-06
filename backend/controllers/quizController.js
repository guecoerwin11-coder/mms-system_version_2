const db = require('../config/db');

// take question
exports.getQuestions = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM quiz_questions WHERE is_active=1 ORDER BY RAND()'
    );
    res.json({ questions: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
  
// create quiz question
exports.createQuestion = async (req, res) => {
  try {
    const { question, option_a, option_b, option_c, correct_option, timer_seconds } = req.body;
    if (!question || !option_a || !option_b || !option_c || !correct_option)
      return res.status(400).json({ message: 'All fields required' });

    const [result] = await db.execute(
      'INSERT INTO quiz_questions (question,option_a,option_b,option_c,correct_option,timer_seconds,created_by) VALUES (?,?,?,?,?,?,?)',
      [question, option_a, option_b, option_c, correct_option.toUpperCase(), timer_seconds || 30, req.user.id]
    );
    res.status(201).json({ message: 'Question created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE QUESTION 
exports.updateQuestion = async (req, res) => {
  try {
    const { question, option_a, option_b, option_c, correct_option, timer_seconds } = req.body;
    await db.execute(
      'UPDATE quiz_questions SET question=?,option_a=?,option_b=?,option_c=?,correct_option=?,timer_seconds=? WHERE id=?',
      [question, option_a, option_b, option_c, correct_option.toUpperCase(), timer_seconds, req.params.id]
    );
    res.json({ message: 'Question updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE QUESTION 
exports.deleteQuestion = async (req, res) => {
  try {
    await db.execute('UPDATE quiz_questions SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Question removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// START QUIZ ATTEMPT 
exports.startAttempt = async (req, res) => {
  try {
    const [result] = await db.execute(
      'INSERT INTO quiz_attempts (student_id) VALUES (?)', [req.user.id]
    );
    const [questions] = await db.execute(
      'SELECT id,question,option_a,option_b,option_c,timer_seconds FROM quiz_questions WHERE is_active=1 ORDER BY RAND()'
    );
    res.status(201).json({ attempt_id: result.insertId, questions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


// SUBMIT QUIZ ATTEMPT 
exports.submitAttempt = async (req, res) => {
  try {
    const { attempt_id, answers } = req.body;
    if (!answers || answers.length === 0) {
      return res.status(400).json({ message: 'No answers provided' });
    }

    const questionIds = answers.map(a => Number(a.question_id));

    // Use db.query instead of execute for dynamic IN clauses
    const [questions] = await db.query(
      'SELECT id, correct_option FROM quiz_questions WHERE id IN (?)', 
      [questionIds] 
    );

    const correctMap = {};
    questions.forEach(q => { 
      // Force uppercase option comparison
      correctMap[q.id] = String(q.correct_option).toUpperCase().trim(); 
    });

    let correct = 0;
    for (const ans of answers) {
      const dbAnswer = correctMap[Number(ans.question_id)];
      const userAnswer = ans.answer_given ? String(ans.answer_given).toUpperCase().trim() : '';

      // Check if user answer matches the DB mapped record
      const isCorrect = (dbAnswer && dbAnswer === userAnswer) ? 1 : 0;
      if (isCorrect) correct++;

      await db.execute(
        'INSERT INTO quiz_answers (attempt_id,question_id,answer_given,is_correct,time_taken) VALUES (?,?,?,?,?)',
        [attempt_id, ans.question_id, userAnswer || null, isCorrect, ans.time_taken || 0]
      );
    }

    const total = answers.length;
    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;

    await db.execute(
      'UPDATE quiz_attempts SET submitted_at=NOW(), score=?, total=?, percentage=? WHERE id=?',
      [correct, total, pct, attempt_id]
    );

    res.json({ score: correct, total, percentage: pct });
  } catch (err) {
    console.error("Quiz Submission Error: ", err);
    res.status(500).json({ message: 'Server error' });
  }
};


// GET ATTEMPT HISTORY 
exports.getAttempts = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.id;
    const [rows] = await db.execute(
      'SELECT * FROM quiz_attempts WHERE student_id=? ORDER BY started_at DESC',
      [studentId]
    );
    res.json({ attempts: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
