/**
 * __tests__/quiz.test.js
 * Tests: get questions, create/update/delete, attempt start/submit
 */

require('./setup');

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../server');
const db      = require('../config/db');

const mockExecute = db._mockExecute;

const MOCK_INSTRUCTOR = { id: 1, name: 'Prof. Reyes', email: 'instructor@ccs.edu', role: 'instructor', department: 'CCS' };
const MOCK_STUDENT    = { id: 2, name: 'Juan', email: 'juan@ccs.edu', role: 'student', year: '3rd Year', section: 'A' };

const MOCK_QUESTION = {
  id: 1, question: 'What is a timeline?',
  option_a: 'A folder', option_b: 'A sequence of clips',
  option_c: 'An export format', correct_option: 'B',
  timer_seconds: 30, is_active: 1,
};

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

beforeEach(() => mockExecute.mockReset());

// ═════════════════════════════════════════════════════════════════════════════
// GET QUESTIONS
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/quiz', () => {

  test('✅ returns all active questions', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])
      .mockResolvedValueOnce([[MOCK_QUESTION, { ...MOCK_QUESTION, id: 2 }]]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .get('/api/quiz')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(2);
    expect(res.body.questions[0]).toHaveProperty('question');
  });

  test('✅ returns empty array when no questions', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])
      .mockResolvedValueOnce([[]]); // no questions

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .get('/api/quiz')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(0);
  });

  test('❌ unauthenticated cannot get questions', async () => {
    const res = await request(app).get('/api/quiz');
    expect(res.status).toBe(401);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// CREATE QUESTION
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/quiz', () => {

  const validQuestion = {
    question: 'What does OBS stand for?',
    option_a: 'Open Broadcast Software',
    option_b: 'Output Broadcast System',
    option_c: 'Online Broadcast Service',
    correct_option: 'A',
    timer_seconds: 30,
  };

  test('✅ instructor can create a question', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])
      .mockResolvedValueOnce([{ insertId: 5 }]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .post('/api/quiz')
      .set('Authorization', `Bearer ${token}`)
      .send(validQuestion);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 5);
    expect(res.body.message).toMatch(/created/i);
  });

  test('❌ student cannot create a question', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_STUDENT]]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .post('/api/quiz')
      .set('Authorization', `Bearer ${token}`)
      .send(validQuestion);

    expect(res.status).toBe(403);
  });

  test('❌ missing required fields returns 400', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .post('/api/quiz')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'Incomplete question' }); // missing options

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE QUESTION
// ═════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/quiz/:id', () => {

  test('✅ instructor can soft-delete a question', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .delete('/api/quiz/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  test('❌ student cannot delete a question', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_STUDENT]]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .delete('/api/quiz/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// SUBMIT ATTEMPT
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/quiz/attempt/submit', () => {

  test('✅ calculates score correctly — 2 out of 3 correct', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])                        // protect
      .mockResolvedValueOnce([[{ correct_option: 'B' }]])             // Q1 answer check
      .mockResolvedValueOnce([{ affectedRows: 1 }])                   // insert Q1 answer
      .mockResolvedValueOnce([[{ correct_option: 'A' }]])             // Q2 answer check
      .mockResolvedValueOnce([{ affectedRows: 1 }])                   // insert Q2 answer
      .mockResolvedValueOnce([[{ correct_option: 'C' }]])             // Q3 answer check
      .mockResolvedValueOnce([{ affectedRows: 1 }])                   // insert Q3 answer
      .mockResolvedValueOnce([{ affectedRows: 1 }]);                  // UPDATE attempt

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .post('/api/quiz/attempt/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attempt_id: 1,
        answers: [
          { question_id: 1, answer_given: 'B', time_taken: 10 }, // ✅ correct
          { question_id: 2, answer_given: 'A', time_taken: 15 }, // ✅ correct
          { question_id: 3, answer_given: 'A', time_taken: 20 }, // ❌ wrong (correct is C)
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.percentage).toBe(67);
  });

  test('✅ returns 100% for all correct answers', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])
      .mockResolvedValueOnce([[{ correct_option: 'B' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .post('/api/quiz/attempt/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attempt_id: 2,
        answers: [{ question_id: 1, answer_given: 'B', time_taken: 8 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.percentage).toBe(100);
  });

  test('✅ returns 0% for all wrong answers', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])
      .mockResolvedValueOnce([[{ correct_option: 'C' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .post('/api/quiz/attempt/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        attempt_id: 3,
        answers: [{ question_id: 1, answer_given: 'A', time_taken: 5 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.percentage).toBe(0);
  });

  test('✅ handles empty answers array', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .post('/api/quiz/attempt/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ attempt_id: 4, answers: [] });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.total).toBe(0);
    expect(res.body.percentage).toBe(0);
  });

});
