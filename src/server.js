const app = require('./app');
const env = require('./config/env');
const { initializeDatabase, pool } = require('./config/database');
const { startScheduledJobs } = require('./services/readings-ingestion');
async function startServer() {
  await initializeDatabase();
  const jobs = startScheduledJobs();
  const server = app.listen(env.port, () => console.log(JSON.stringify({ event: 'obm-api-started' })));
  async function close() {
    jobs.stop(); await new Promise(resolve => server.close(resolve));
    await require('./services/tenant-runtime')().close(); await pool.end();
  }
  process.once('SIGTERM', () => void close()); process.once('SIGINT', () => void close());
}
startServer().catch(() => { console.error('OBM startup failed'); process.exitCode = 1; });
