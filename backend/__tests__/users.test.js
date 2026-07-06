/**
 * __tests__/users.test.js
 * Tests: get students, update profile, delete student
 */

require('./setup');

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const app     = require('../server');
const db      = require('../config/db');

const mockExecute = db._mockExecute;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const MOCK_INSTRUCTOR = {
  id: 1, name: 'Prof. Reyes', email: 'instructor@ccs.edu',
  role: 'instructor', department: 'CCS',
  year: null, section: null, profile_pic: null,
};

const MOCK_STUDENT = {
  id: 2, name: 'Juan dela Cruz', email: 'juan@ccs.edu',
  role: 'student', year: '3rd Year', section: 'A',
  profile_pic: null, avg_score: 85, submissions: 3,
};

const MOCK_STUDENT_2 = {
  id: 3, name: 'Maria Santos', email: 'maria@ccs.edu',
  role: 'student', year: '3rd Year', section: 'A',
  profile_pic: null, avg_score: 90, submissions: 2,
};

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

beforeEach(() => mockExecute.mockReset());

// ═════════════════════════════════════════════════════════════════════════════
// GET STUDENTS
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/users', () => {

  test('✅ instructor can get all students', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])   // protect middleware
      .mockResolvedValueOnce([[MOCK_STUDENT, MOCK_STUDENT_2]]); // getStudents query

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(2);
    expect(res.body.students[0].role).toBeUndefined(); // role not returned
  });

  test('✅ instructor can filter by section', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])
      .mockResolvedValueOnce([[MOCK_STUDENT]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .get('/api/users?section=A')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.students)).toBe(true);
  });

  test('❌ student cannot access student list', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_STUDENT]]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/instructor access required/i);
  });

  test('❌ unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// UPDATE PROFILE
// ═════════════════════════════════════════════════════════════════════════════
describe('PUT /api/users/profile', () => {

  test('✅ instructor can update their profile', async () => {
    const updatedUser = { ...MOCK_INSTRUCTOR, name: 'Prof. Updated', department: 'IT' };
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])    // protect
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
      .mockResolvedValueOnce([[updatedUser]]);       // SELECT after update

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Prof. Updated', department: 'IT', gmail: '', year: null, section: null });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Prof. Updated');
  });

  test('✅ student can update their profile', async () => {
    const updatedStudent = { ...MOCK_STUDENT, name: 'Juan Updated', section: 'B' };
    mockExecute
      .mockResolvedValueOnce([[MOCK_STUDENT]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[updatedStudent]]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Juan Updated', year: '3rd Year', section: 'B', gmail: '', department: null });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Juan Updated');
  });

  test('❌ unauthenticated request is rejected', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .send({ name: 'Hacker' });

    expect(res.status).toBe(401);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE STUDENT
// ═════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/users/:id', () => {

  test('✅ instructor can delete a student', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])             // protect
      .mockResolvedValueOnce([[{ id: 2, name: 'Juan dela Cruz', role: 'student' }]]) // SELECT check
      .mockResolvedValueOnce([{ affectedRows: 1 }])           // DELETE ai_chat_history
      .mockResolvedValueOnce([{ affectedRows: 0 }])           // DELETE peer_evaluations
      .mockResolvedValueOnce([{ affectedRows: 0 }])           // DELETE group_members
      .mockResolvedValueOnce([{ affectedRows: 0 }])           // DELETE quiz_answers subquery
      .mockResolvedValueOnce([{ affectedRows: 0 }])           // DELETE quiz_attempts
      .mockResolvedValueOnce([{ affectedRows: 0 }])           // DELETE submissions
      .mockResolvedValueOnce([{ affectedRows: 0 }])           // DELETE chapter_progress
      .mockResolvedValueOnce([{ affectedRows: 1 }]);          // DELETE users

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .delete('/api/users/2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });

  test('❌ instructor cannot delete themselves', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .delete(`/api/users/${MOCK_INSTRUCTOR.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot delete your own account/i);
  });

  test('❌ cannot delete non-existent student', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])
      .mockResolvedValueOnce([[]]); // student not found

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .delete('/api/users/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('❌ cannot delete an instructor account', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])
      .mockResolvedValueOnce([[{ id: 5, name: 'Other Instructor', role: 'instructor' }]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .delete('/api/users/5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/can only delete student/i);
  });

  test('❌ student cannot delete other students', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_STUDENT]]);

    const token = makeToken(MOCK_STUDENT);
    const res = await request(app)
      .delete('/api/users/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('❌ unauthenticated cannot delete', async () => {
    const res = await request(app).delete('/api/users/2');
    expect(res.status).toBe(401);
  });

});
