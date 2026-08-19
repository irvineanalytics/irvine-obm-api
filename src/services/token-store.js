const crypto = require('crypto');

const tokens = new Map();

function issueToken({ username, ttlHours }) {
  const expiresAtMs = Date.now() + ttlHours * 60 * 60 * 1000;
  const expiresAtUnix = Math.floor(expiresAtMs / 1000);
  const token = `${crypto.randomBytes(24).toString('base64url')}_${expiresAtUnix}`;

  tokens.set(token, {
    username,
    expiresAtMs
  });

  return token;
}

function validateToken(token) {
  if (!token) {
    return false;
  }

  const record = tokens.get(token);

  if (!record) {
    return false;
  }

  if (record.expiresAtMs <= Date.now()) {
    tokens.delete(token);
    return false;
  }

  return true;
}

module.exports = {
  issueToken,
  validateToken
};
