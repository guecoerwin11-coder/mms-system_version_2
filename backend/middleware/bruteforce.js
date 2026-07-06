/**
 * middleware/bruteForce.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Brute force protection using Redis.
 * - Tracks failed login attempts per IP address
 * - After 10 failed attempts → blocks that IP for 5 minutes
 * - Resets counter on successful login
 *
 * If Redis is unavailable, falls through silently (fail-open)
 * so the app still works without Redis in development.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const redis = require('redis');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS   = 10;           // max failed attempts before lockout
const WINDOW_SECONDS = 5 * 60;       // 5 minutes lockout duration
const KEY_PREFIX     = 'bf:login:';  // Redis key prefix

// ── CREATE REDIS CLIENT ───────────────────────────────────────────────────────
let client = null;
let redisReady = false;

function getClient() {
  if (client) return client;

  client = redis.createClient({
    url: process.env.REDIS_URL 
  });

  client.on('ready', () => {
    redisReady = true;
    console.log('✅ Redis connected (brute force protection active)');
  });

  client.on('error', (err) => {
    redisReady = false;
    console.warn('⚠️  Redis unavailable — brute force protection disabled:', err.message);
  });

  client.connect().catch(err => {
    console.warn('⚠️  Redis connect failed:', err.message);
  });

  return client;
}

// Initialize client on module load
getClient();

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getKey(ip) {
  return KEY_PREFIX + ip;
}

// Get number of failed attempts for this IP
async function getAttempts(ip) {
  try {
    const val = await client.get(getKey(ip));
    return val ? parseInt(val) : 0;
  } catch {
    return 0;
  }
}

// Get remaining TTL (seconds) for the lockout
async function getTTL(ip) {
  try {
    return await client.ttl(getKey(ip));
  } catch {
    return 0;
  }
}

// Increment failed attempts — sets expiry on first increment
async function incrementAttempts(ip) {
  try {
    const key = getKey(ip);
    const attempts = await client.incr(key);
    // Set expiry only on first attempt (so window resets on first failure)
    if (attempts === 1) {
      await client.expire(key, WINDOW_SECONDS);
    }
    return attempts;
  } catch {
    return 0;
  }
}

// Reset attempts after successful login
async function resetAttempts(ip) {
  try {
    await client.del(getKey(ip));
  } catch {
    // silently ignore
  }
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
/**
 * checkBruteForce — runs BEFORE login handler
 * Blocks the request if IP is locked out
 */
async function checkBruteForce(req, res, next) {
  // If Redis is not ready, skip protection silently
  if (!redisReady) return next();

  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    const attempts = await getAttempts(ip);

    if (attempts >= MAX_ATTEMPTS) {
      const ttl = await getTTL(ip);
      const minutesLeft = Math.ceil(ttl / 60);
      const secondsLeft = ttl;

      return res.status(429).json({
        message: `Too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        retryAfter: secondsLeft,
        attemptsUsed: attempts,
        maxAttempts: MAX_ATTEMPTS,
      });
    }

    // Attach helper functions to request so the login controller can use them
    req.bruteForce = {
      ip,
      onFailure: () => incrementAttempts(ip),
      onSuccess: () => resetAttempts(ip),
      attemptsRemaining: MAX_ATTEMPTS - attempts,
    };

    next();
  } catch (err) {
    // Redis error — fail open (let request through)
    console.warn('[BruteForce] Redis error, skipping check:', err.message);
    next();
  }
}

module.exports = {
  checkBruteForce,
  resetAttempts,   // exported so authController can call it on logout too
  getAttempts,     // exported for testing
  MAX_ATTEMPTS,
  WINDOW_SECONDS,
};
