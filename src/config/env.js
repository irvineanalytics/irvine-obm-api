const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  upstreamBaseUrl: process.env.UPSTREAM_BASE_URL || 'https://meterportal.obmeters.com',
  apiUsername: process.env.API_USERNAME || 'APIdemo1!',
  apiPassword: process.env.API_PASSWORD || 'OBapi1!',
  tokenRefreshHours: Number(process.env.TOKEN_REFRESH_HOURS) || 12,
  verboseRequestLogging: process.env.VERBOSE_REQUEST_LOGGING === 'true' || process.env.NODE_ENV !== 'production'
};

module.exports = env;
