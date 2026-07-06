require('./setup');

const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const app      = require('../server');
const db       = require('../config/db');
const redis    = require('redis');

// Get the mocked execute function and redis store
const mockExecute = db._mockExecute;
const redisClient = redis.createClient();

// ── HELPERS ───────────────────────────────────────────────────────────────────
const HASHED_PASSWORD = bcrypt.hashSync('admin123', 10);

const MOCK_INSTRUCTOR = {
  id: 1, name: 'Prof. Reyes', email: 'instructor@ccs.edu',
  password: HASHED_PASSWORD, role: 'instructor',
  department: 'CCS', year: null, section: null,
  profile_pic: null, gmail: null,
};

const MOCK_STUDENT = {
  id: 2, name: 'Juan dela Cruz', email: 'juan@ccs.edu',
  password: bcrypt.hashSync('ccs2024!', 10), role: 'student',
  year: '3rd Year', section: 'A', department: null,
  profile_pic: null, gmail: null,
};

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'test_fallback_secret_key', { expiresIn: '7d' });
}

// ── RESET MOCKS BEFORE EACH TEST ─────────────────────────────────────────────
beforeEach(() => {
  mockExecute.mockReset();
  redisClient._clear();
});

// AUTH — LOGIN
describe('POST /api/auth/login', () => {

  test('✅ should login instructor with correct credentials', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('instructor');
    expect(res.body.user.email).toBe('instructor@ccs.edu');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('✅ should login student with correct credentials', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_STUDENT]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'juan@ccs.edu', password: 'ccs2024!' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.section).toBe('A');
  });

  test('❌ should reject wrong password', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('❌ should reject non-existent email', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@ccs.edu', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('❌ should reject missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'admin123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email and password required/i);
  });

  test('❌ should reject missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu' });

    expect(res.status).toBe(400);
  });

  test('✅ should return valid JWT token', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'admin123' });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET || 'test_fallback_secret_key');
    expect(decoded.id).toBe(MOCK_INSTRUCTOR.id);
    expect(decoded.role).toBe('instructor');
  });

  test('✅ should be case-insensitive for email', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'INSTRUCTOR@CCS.EDU', password: 'admin123' });

    expect(res.status).toBe(200);
  });

});

// BRUTE FORCE PROTECTION
describe('Brute Force Protection — POST /api/auth/login', () => {

  test('❌ should block after 10 failed attempts', async () => {
    redisClient._store.set('bf:login:::ffff:127.0.0.1', '10');
    mockExecute.mockResolvedValue([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'wrongpassword' });

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/too many failed login attempts/i);
    expect(res.body).toHaveProperty('retryAfter');
  });

  test('✅ should allow login after counter resets', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('✅ should warn when 3 attempts remaining', async () => {
    redisClient._store.set('bf:login:::ffff:127.0.0.1', '7');
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/attempts? left/i);
  });

  test('✅ should reset counter on successful login', async () => {
    redisClient._store.set('bf:login:::ffff:127.0.0.1', '5');
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@ccs.edu', password: 'admin123' });

    const storedAttempts = redisClient._store.get('bf:login:::ffff:127.0.0.1');
    expect(storedAttempts).toBeUndefined();
  });

});

// AUTH — GET ME
describe('GET /api/auth/me', () => {

  test('✅ should return current user with valid token', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('instructor@ccs.edu');
  });

  test('❌ should reject request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  test('❌ should reject invalid/expired token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });

  test('❌ should reject malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'NotBearer sometoken');

    expect(res.status).toBe(401);
  });

});

// AUTH — CHANGE PASSWORD
describe('PUT /api/auth/change-password', () => {

  test('✅ should change password with correct current password', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]]) // protect middleware user check
      .mockResolvedValueOnce([[{ password: HASHED_PASSWORD }]]) // SELECT password check
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE query execution

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: 'newPass456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password changed/i);
  });

  test('❌ should reject wrong current password', async () => {
    mockExecute
      .mockResolvedValueOnce([[MOCK_INSTRUCTOR]])
      .mockResolvedValueOnce([[{ password: HASHED_PASSWORD }]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongcurrent', newPassword: 'newPass456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/current password is incorrect/i);
  });

  test('❌ should reject password shorter than 6 characters', async () => {
    mockExecute.mockResolvedValueOnce([[MOCK_INSTRUCTOR]]);

    const token = makeToken(MOCK_INSTRUCTOR);
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin123', newPassword: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 characters/i);
  });

  test('❌ should reject unauthenticated request', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ currentPassword: 'admin123', newPassword: 'newPass456' });

    expect(res.status).toBe(401);
  });

});