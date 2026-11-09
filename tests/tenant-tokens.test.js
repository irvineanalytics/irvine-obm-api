const { TokenManager } = require('../src/services/upstream-token-manager');
test('OBM tokens, URLs and revisions are isolated per company and rotation refreshes only that company', async () => {
  const rows = [1, 2].map(company => ({ company_id: company, revision: 'first',
    config: { base_url: `https://company-${company}.invalid`, username: `user-${company}`, token_refresh_hours: 1 }, secret: { password: `secret-${company}` } }));
  const calls = [];
  const manager = new TokenManager({ get: async company => rows[company - 1] }, async url => {
    calls.push(url); return { ok: true, json: async () => ({ 'access-token': url.searchParams.get('username') + '-token' }) };
  });
  const [a, b] = await Promise.all([manager.get(1), manager.get(2)]);
  expect(a.token).toBe('user-1-token'); expect(b.token).toBe('user-2-token');
  expect(a.baseUrl).toBe('https://company-1.invalid'); expect(calls).toHaveLength(2);
  await manager.get(1); expect(calls).toHaveLength(2);
  rows[0].revision = 'second'; rows[0].config.base_url = 'https://changed.invalid';
  expect((await manager.get(1)).baseUrl).toBe('https://changed.invalid'); expect(calls).toHaveLength(3);
  expect((await manager.get(2)).token).toBe('user-2-token'); expect(calls).toHaveLength(3);
});
test('bad upstream responses cannot disclose credentials or fall back to a stale token', async () => {
  const manager = new TokenManager({ get: async () => ({ company_id: 1, revision: 'r', config: { base_url: 'https://tenant.invalid', username: 'u', token_refresh_hours: 1 }, secret: { password: 'secret' } }) },
    async () => { throw new Error('credential-in-transport-error'); });
  await expect(manager.get(1)).rejects.toThrow('Tenant OBM authentication unavailable');
  expect(manager.tokens.size).toBe(0);
});
