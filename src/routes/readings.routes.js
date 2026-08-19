const express = require('express');

const env = require('../config/env');
const { issueToken } = require('../services/token-store');
const { requireApiToken } = require('../middleware/require-api-token');

const router = express.Router();

function getYesterdayDateString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

function isValidDateInput(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateString;
}

router.get('/request-token', (req, res) => {
  const { username, password } = req.query;

  if (!username || !password) {
    return res.status(400).json({
      message: 'username and password are required'
    });
  }

  if (username !== env.apiUsername || password !== env.apiPassword) {
    return res.status(401).json({
      message: 'Invalid username or password'
    });
  }

  const accessToken = issueToken({
    username,
    ttlHours: env.tokenTtlHours
  });

  return res.status(200).json({
    'access-token': accessToken
  });
});

router.use(requireApiToken);

router.get('/list', (req, res) => {
  return res.status(200).json({
    success: true,
    meters: [],
    total: 0
  });
});

router.get('/get-all-accounts-by-group', (req, res) => {
  return res.status(200).json({
    success: true,
    accounts: [],
    total: 0
  });
});

router.get('/get-accounts-by-sub-group', (req, res) => {
  const { subgroup } = req.query;

  if (!subgroup) {
    return res.status(400).json({
      message: 'subgroup is required'
    });
  }

  return res.status(200).json({
    success: true,
    subgroup,
    accounts: [],
    total: 0
  });
});

router.get('/get-site-readings', (req, res) => {
  const { site, date } = req.query;

  if (!site) {
    return res.status(400).json({
      message: 'site is required'
    });
  }

  const readingDate = date || getYesterdayDateString();

  if (!isValidDateInput(readingDate)) {
    return res.status(400).json({
      message: 'date must be in YYYY-MM-DD format'
    });
  }

  return res.status(200).json({
    success: true,
    site,
    date: readingDate,
    readings: [],
    total: 0
  });
});

router.get('/get-site-daily', (req, res) => {
  const { site, date } = req.query;

  if (!site) {
    return res.status(400).json({
      message: 'site is required'
    });
  }

  const readingDate = date || getYesterdayDateString();

  if (!isValidDateInput(readingDate)) {
    return res.status(400).json({
      message: 'date must be in YYYY-MM-DD format'
    });
  }

  return res.status(200).json({
    success: true,
    site,
    date: readingDate,
    dailyReadings: [],
    total: 0
  });
});

module.exports = router;
