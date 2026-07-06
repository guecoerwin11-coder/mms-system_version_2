/**
 * __tests__/setup.js
 * Runs before every test file.
 * Mocks the database and Redis so tests never touch real data.
 */

// ── MOCK REDIS ────────────────────────────────────────────────────────────────
jest.mock('redis', () => {
  const store = new Map();
  const ttlStore = new Map();

  const mockClient = {
    connect:  jest.fn().mockResolvedValue(true),
    get:      jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    set:      jest.fn((key, val) => { store.set(key, String(val)); return Promise.resolve('OK'); }),
    incr:     jest.fn((key) => {
      const cur = parseInt(store.get(key) || '0') + 1;
      store.set(key, String(cur));
      return Promise.resolve(cur);
    }),
    expire:   jest.fn((key, secs) => { ttlStore.set(key, secs); return Promise.resolve(1); }),
    ttl:      jest.fn((key) => Promise.resolve(ttlStore.get(key) ?? -1)),
    del:      jest.fn((key) => { store.delete(key); ttlStore.delete(key); return Promise.resolve(1); }),
    on:       jest.fn(),
    emit:     jest.fn(),
    _store:   store,
    _clear:   () => { store.clear(); ttlStore.clear(); },
  };

  return { createClient: jest.fn(() => mockClient) };
});

// ── MOCK MYSQL DATABASE ───────────────────────────────────────────────────────
jest.mock('../config/db', () => {
  const mockExecute = jest.fn();  
  const mockPool = { execute: mockExecute, getConnection: jest.fn().mockResolvedValue({ release: jest.fn() }) };
  const db = jest.fn(() => mockPool);
  db._mockExecute = mockExecute;
  db._mockPool    = mockPool;
  return db;  
});

// ── ENV VARS FOR TESTS ────────────────────────────────────────────────────────
process.env.JWT_SECRET    = 'test_secret_key_12345';
process.env.NODE_ENV      = 'test';
process.env.CLIENT_URL    = 'http://localhost:3001';
process.env.DB_NAME       = 'mms_db_test';

// ── SUPPRESS CONSOLE IN TESTS ─────────────────────────────────────────────────
global.console.log  = jest.fn();
global.console.warn = jest.fn();    
