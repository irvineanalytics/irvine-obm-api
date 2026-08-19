const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  apiUsername: process.env.API_USERNAME || 'APIdemo1!',
  apiPassword: process.env.API_PASSWORD || 'OBapi1!',
  tokenTtlHours: Number(process.env.TOKEN_TTL_HOURS) || 24
};

module.exports = env;
