const runtime = require('./tenant-runtime');
const { getToken } = require('./upstream-token-manager');
const { currentCompany } = require('@irvine/tenant-runtime');
const paths = new Set(['/readings/list', '/readings/get-all-accounts-by-group', '/readings/get-accounts-by-sub-group', '/readings/get-site-readings', '/readings/get-site-daily']);
async function get(pathname, query = {}, { company = currentCompany(), signal } = {}) {
  if (!paths.has(pathname)) throw new Error('Unsupported OBM request');
  const token = await getToken(company, signal);
  const url = new URL(pathname, token.baseUrl);
  for (const key of ['site', 'date', 'subgroup']) if (query[key] !== undefined) url.searchParams.set(key, query[key]);
  url.searchParams.set('apiAccessToken', token.token);
  try {
    const response = await fetch(url, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch { throw new Error('Tenant OBM request unavailable'); }
}
module.exports = { get };
