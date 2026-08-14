const crypto = require('crypto')
const { promisify } = require('util')

const scryptAsync = promisify(crypto.scrypt)
const KEY_LENGTH = 64

async function hashPassword(password) {
  const value = String(password || '')
  const salt = crypto.randomBytes(16)
  const derivedKey = await scryptAsync(value, salt, KEY_LENGTH)

  return `scrypt$v1$${salt.toString('base64url')}$${Buffer.from(derivedKey).toString('base64url')}`
}

async function verifyPassword(password, encodedHash) {
  const parts = String(encodedHash || '').split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') {
    return false
  }

  try {
    const salt = Buffer.from(parts[2], 'base64url')
    const expected = Buffer.from(parts[3], 'base64url')
    const actual = Buffer.from(
      await scryptAsync(String(password || ''), salt, expected.length)
    )

    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  } catch (_error) {
    return false
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
}
