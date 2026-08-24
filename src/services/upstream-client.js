const env = require('../config/env');
const { getCurrentToken } = require('./upstream-token-manager');

async function get(pathname, query = {}) {
  const url = new URL(pathname, env.upstreamBaseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  url.searchParams.set('apiAccessToken', getCurrentToken());

  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(`Upstream request failed (${response.status})`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

module.exports = {
  get
};
