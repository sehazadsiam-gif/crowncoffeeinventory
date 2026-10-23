// In-memory IP rate limiter for brute-force protection
const attemptsMap = new Map()

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of attemptsMap.entries()) {
      if (now > record.resetTime && (!record.lockedUntil || now > record.lockedUntil)) {
        attemptsMap.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export function getClientIp(request) {
  if (!request) return '127.0.0.1'
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

/**
 * Check rate limit for a client IP.
 * @param {string} ip - Client IP
 * @param {number} maxAttempts - Allowed failed attempts (default 5)
 * @param {number} lockDurationMs - Lock duration when exceeded (default 15 mins)
 */
export function checkRateLimit(ip, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000) {
  const now = Date.now()
  let record = attemptsMap.get(ip)

  if (!record) {
    record = { attempts: 0, resetTime: now + lockDurationMs, lockedUntil: null }
    attemptsMap.set(ip, record)
  }

  // Check if IP is currently locked
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      allowed: false,
      remainingSeconds: remainingSec,
      error: `Too many failed login attempts. Locked for security. Try again in ${remainingSec} seconds.`
    }
  }

  // If window expired, reset attempts
  if (now > record.resetTime) {
    record.attempts = 0
    record.resetTime = now + lockDurationMs
    record.lockedUntil = null
  }

  return {
    allowed: true,
    recordFailure: () => {
      record.attempts += 1
      if (record.attempts >= maxAttempts) {
        record.lockedUntil = Date.now() + lockDurationMs
      }
    },
    reset: () => {
      attemptsMap.delete(ip)
    }
  }
}
