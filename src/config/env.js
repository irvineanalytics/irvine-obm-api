const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'test') dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || '',
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbName: process.env.DB_NAME || 'irvine_obm',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || '',
  dbSsl: process.env.DB_SSL === 'true',
  dbPoolMax: Number(process.env.DB_POOL_MAX) || 10,
  dbIdleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  dbConnectTimeoutMs: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
  processorBaseUrl: process.env.PROCESSOR_BASE_URL || 'http://irvine_processor:7000',
  readingIngestionIntervalMs: Number(process.env.READING_INGESTION_INTERVAL_MS) || 30 * 60 * 1000,
  siteSyncIntervalMs: Number(process.env.SITE_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1000,
};

module.exports = env;
