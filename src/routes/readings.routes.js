const express = require('express');

const env = require('../config/env');
const upstreamClient = require('../services/upstream-client');
const { requestUpstreamToken, getTokenLoadedAt } = require('../services/upstream-token-manager');

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

router.get('/request-token', async (req, res, next) => {
  // const { username, password } = req.query;
  const { username, password } = {username: env.apiUsername, password: env.apiPassword};

  if (!username || !password) {
    return res.status(400).json({
      message: 'username and password are required'
    });
  }

  try {
    const refreshedToken = await requestUpstreamToken();

    return res.status(200).json({
      message: 'Upstream token refreshed',
      'access-token': refreshedToken,
      loadedAt: getTokenLoadedAt()
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/list', async (req, res, next) => {
  try {
    const data = await upstreamClient.get('/readings/list');
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/get-all-accounts-by-group', async (req, res, next) => {
  try {
    const data = await upstreamClient.get('/readings/get-all-accounts-by-group');
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/get-accounts-by-sub-group', async (req, res, next) => {
  const { subgroup } = req.query;

  if (!subgroup) {
    return res.status(400).json({
      message: 'subgroup is required'
    });
  }

  try {
    const data = await upstreamClient.get('/readings/get-accounts-by-sub-group', {
      subgroup
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/get-site-readings', async (req, res, next) => {
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

  try {
    const data = await upstreamClient.get('/readings/get-site-readings', {
      site,
      date: readingDate
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/get-site-daily', async (req, res, next) => {
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

  try {
    const data = await upstreamClient.get('/readings/get-site-daily', {
      site,
      date: readingDate
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
