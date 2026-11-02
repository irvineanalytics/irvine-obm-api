const runtime = require('./tenant-runtime');
const { currentCompany } = require('@irvine/tenant-runtime');
class TokenManager {
  constructor(loader, fetchImpl = fetch, now = Date.now) { Object.assign(this, { loader, fetch: fetchImpl, now }); this.tokens = new Map(); this.pending = new Map(); }
  async get(company, signal, force = false) {
    const integration = await this.loader.get(company, 'obm');
    const cached = this.tokens.get(company);
    if (!force && cached?.revision === integration.revision && cached.expires > this.now()) return cached;
    const key = `${company}:${integration.revision}`;
    if (this.pending.has(key)) return this.pending.get(key);
    const work = this.load(integration, signal);
    this.pending.set(key, work);
    try { return await work; } finally { this.pending.delete(key); }
  }
  async load(integration, signal) {
    const url = new URL('/readings/request-token', integration.config.base_url);
    url.searchParams.set('username', integration.config.username);
    url.searchParams.set('password', integration.secret.password);
    try {
      const response = await this.fetch(url, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (typeof payload['access-token'] !== 'string' || !payload['access-token']) throw new Error();
      const loaded = this.now();
      const ttl = Math.min(integration.config.token_refresh_hours * 3600000, Number(payload.expires_in || 43200) * 1000);
      if (!Number.isFinite(ttl) || ttl <= 0) throw new Error();
      const value = { baseUrl: integration.config.base_url, token: payload['access-token'], loadedAt: new Date(loaded).toISOString(), expires: loaded + ttl, revision: integration.revision };
      this.tokens.set(integration.company_id, value);
      return value;
    } catch { this.tokens.delete(integration.company_id); throw new Error('Tenant OBM authentication unavailable'); }
  }
}
let instance;
const manager = () => instance ||= new TokenManager(runtime().loader);
module.exports = { TokenManager,
  getToken: (company = currentCompany(), signal) => manager().get(company, signal),
  requestUpstreamToken: (company = currentCompany(), signal) => manager().get(company, signal, true),
};
