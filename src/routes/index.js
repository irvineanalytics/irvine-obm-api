const express = require('express');
const healthRoutes = require('./health.routes');
const readingsRoutes = require('./readings.routes');
const { requireApiToken } = require('../middleware/require-api-token');

const router = express.Router();

router.use('/readings', readingsRoutes);

// All API routes except /readings/request-token require a valid token.
router.use(requireApiToken);
router.use('/health', healthRoutes);

module.exports = router;
