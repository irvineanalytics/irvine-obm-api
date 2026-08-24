const app = require('./app');
const env = require('./config/env');
const { initializeTokenManager, requestUpstreamToken } = require('./services/upstream-token-manager');

async function startServer() {
  // await initializeTokenManager();

  // const refreshMs = env.tokenRefreshHours * 60 * 60 * 1000;
  // const refreshTimer = setInterval(async () => {
  //   try {
  //     await requestUpstreamToken();
  //   } catch (error) {
  //     console.error(`[token] Scheduled refresh failed: ${error.message}`);
  //   }
  // }, refreshMs);

  // refreshTimer.unref();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
    console.log(`API base path: ${env.apiPrefix}`);
    console.log(`Upstream base URL: ${env.upstreamBaseUrl}`);
    console.log(`Token refresh interval (hours): ${env.tokenRefreshHours}`);
    console.log(`Swagger UI: http://localhost:${env.port}/api-docs`);
    console.log(`OpenAPI JSON: http://localhost:${env.port}/api-docs.json`);
  });
}

startServer().catch((error) => {
  console.error(`[startup] Failed to initialize API: ${error.message}`);
  process.exit(1);
});
