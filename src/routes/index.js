const express = require('express');
const healthRoutes = require('./health.routes');
const readingsRoutes = require('./readings.routes');

const router = express.Router();

router.use('/readings', readingsRoutes);
router.use('/health', healthRoutes);

module.exports = router;
