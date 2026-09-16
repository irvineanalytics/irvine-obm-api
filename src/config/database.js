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
