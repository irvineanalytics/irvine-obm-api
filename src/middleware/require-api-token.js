const { validateToken } = require('../services/token-store');

function requireApiToken(req, res, next) {
  const token = req.query.apiAccessToken;

  if (!token || !validateToken(token)) {
    return res.status(401).json({
      message: 'Invalid or missing apiAccessToken query parameter'
    });
  }

  return next();
}

module.exports = {
  requireApiToken
};
