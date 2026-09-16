const request = require('supertest');

jest.mock('../src/services/upstream-client', () => ({
  get: jest.fn()
}));

jest.mock('../src/services/upstream-token-manager', () => ({
  requestUpstreamToken: jest.fn(),
  getTokenLoadedAt: jest.fn()
}));

const upstreamClient = require('../src/services/upstream-client');
const tokenManager = require('../src/services/upstream-token-manager');
const app = require('../src/app');

describe('Readings routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/v1/readings/request-token returns refreshed token payload', async () => {
    tokenManager.requestUpstreamToken.mockResolvedValue('token_123');
    tokenManager.getTokenLoadedAt.mockReturnValue('2026-08-24T00:00:00.000Z');

    const response = await request(app).get('/api/v1/readings/request-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Upstream token refreshed',
      'access-token': 'token_123',
      loadedAt: '2026-08-24T00:00:00.000Z'
    });
    expect(tokenManager.requestUpstreamToken).toHaveBeenCalledTimes(1);
  });

  test('GET /api/v1/readings/list returns upstream data', async () => {
    upstreamClient.get.mockResolvedValue({ meters: [{ id: 'm1' }] });

    const response = await request(app).get('/api/v1/readings/list');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ meters: [{ id: 'm1' }] });
    expect(upstreamClient.get).toHaveBeenCalledWith('/readings/list');
  });

  test('GET /api/v1/readings/get-accounts-by-sub-group validates subgroup', async () => {
    const response = await request(app).get('/api/v1/readings/get-accounts-by-sub-group');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('subgroup is required');
  });

  test('GET /api/v1/readings/get-site-readings validates site', async () => {
    const response = await request(app).get('/api/v1/readings/get-site-readings');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('site is required');
  });

  test('GET /api/v1/readings/get-site-readings validates date format', async () => {
    const response = await request(app)
      .get('/api/v1/readings/get-site-readings')
      .query({ site: 'Heywood', date: '24-08-2026' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('date must be in YYYY-MM-DD format');
  });

  test('GET /api/v1/readings/get-site-readings defaults date to yesterday', async () => {
    upstreamClient.get.mockResolvedValue({ readings: [] });

    const response = await request(app)
      .get('/api/v1/readings/get-site-readings')
      .query({ site: 'Heywood' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ readings: [] });

    expect(upstreamClient.get).toHaveBeenCalledTimes(1);
    const [, query] = upstreamClient.get.mock.calls[0];
    expect(query.site).toBe('Heywood');
    expect(query.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('GET /api/v1/readings/get-site-daily validates date format', async () => {
    const response = await request(app)
      .get('/api/v1/readings/get-site-daily')
      .query({ site: 'Heywood', date: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('date must be in YYYY-MM-DD format');
  });

  test('GET /api/v1/readings/get-site-daily forwards valid query upstream', async () => {
    upstreamClient.get.mockResolvedValue({ dailyReadings: [] });

    const response = await request(app)
      .get('/api/v1/readings/get-site-daily')
      .query({ site: 'Heywood', date: '2026-08-18' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ dailyReadings: [] });
    expect(upstreamClient.get).toHaveBeenCalledWith('/readings/get-site-daily', {
      site: 'Heywood',
      date: '2026-08-18'
    });
  });
});
