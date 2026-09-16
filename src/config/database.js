const { Pool } = require('pg');
const env = require('./env');

function buildPoolConfig() {
  if (env.databaseUrl) {
    const parsedUrl = new URL(env.databaseUrl);
    const username = decodeURIComponent(parsedUrl.username || env.dbUser || '');
    const password = decodeURIComponent(parsedUrl.password || env.dbPassword || '');

    if (!username || !parsedUrl.hostname || !parsedUrl.pathname || !password) {
      throw new Error(
        'Invalid DATABASE_URL. Provide username, password, host, and database name, or use DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.'
      );
    }

    return {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : env.dbPort,
      database: parsedUrl.pathname.replace(/^\//, ''),
      user: username,
      password: String(password),
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
      max: env.dbPoolMax,
      idleTimeoutMillis: env.dbIdleTimeoutMs,
      connectionTimeoutMillis: env.dbConnectTimeoutMs
    };
  }

  if (!env.dbHost || !env.dbName || !env.dbUser || !env.dbPassword) {
    throw new Error(
      'Missing PostgreSQL credentials. Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env or provide a valid DATABASE_URL.'
    );
  }

  return {
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    password: String(env.dbPassword),
    ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    max: env.dbPoolMax,
    idleTimeoutMillis: env.dbIdleTimeoutMs,
    connectionTimeoutMillis: env.dbConnectTimeoutMs
  };
}

const pool = new Pool(buildPoolConfig());

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS obm_sites (
        id BIGSERIAL PRIMARY KEY,
        site_name TEXT NOT NULL UNIQUE,
        modem_dtu INTEGER,
        meter_id INTEGER,
        raw_data JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS obm_readings (
        id BIGSERIAL PRIMARY KEY,
        site_name TEXT NOT NULL,
        reading_date DATE NOT NULL,
        meter_serial TEXT NOT NULL,
        sub_group TEXT,
        meter_group TEXT,
        reading_time TIME NOT NULL,
        import_kwh NUMERIC,
        export_kwh NUMERIC,
        total_kwh NUMERIC,
        raw_data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (site_name, reading_date, meter_serial, reading_time)
      )
    `);

    const result = await client.query('SELECT NOW() AS now');
    console.log(`[db] PostgreSQL connected. server_time=${result.rows[0].now.toISOString()}`);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase
};
