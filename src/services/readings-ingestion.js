const { randomUUID } = require('node:crypto');
const { currentCompany, ownedDevice, eventId, runPerCompany, schedule, assertCurrentLease } = require('@irvine/tenant-runtime');
const runtime = require('./tenant-runtime');
const upstream = require('./upstream-client');
const env = require('../config/env');
const getDateString = (date = new Date()) => date.toISOString().slice(0, 10);

async function syncSites(company = currentCompany(), lease, db = runtime().db, client = upstream) {
  const sites = await client.get('/readings/list', {}, { company, signal: lease?.signal });
  if (!Array.isArray(sites)) throw new Error('Invalid OBM site list');
  for (const site of sites) {
    if (!site.SerialNumber || String(site.SerialNumber).length > 64) throw new Error('Invalid OBM site identity');
    await lease?.assertOwned();
    await db.query(`INSERT INTO energy_location (id, company_id, code, name, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW()) ON CONFLICT (company_id, code)
      DO UPDATE SET name = EXCLUDED.name, is_active = TRUE, updated_at = NOW()`,
    [randomUUID(), company, String(site.SerialNumber), String(site.Name || site.SerialNumber).slice(0, 128)]);
  }
  return sites.length;
}
async function getActiveSites(company = currentCompany(), db = runtime().db) {
  const result = await db.query('SELECT code AS site_name FROM energy_location WHERE company_id = $1 AND is_active = TRUE ORDER BY code', [company]);
  return result.rows.map(row => row.site_name);
}
async function requireSite(site, company = currentCompany(), db = runtime().db) {
  const result = await db.query('SELECT id FROM energy_location WHERE code = $1 AND company_id = $2 AND is_active = TRUE', [site, company]);
  if (result.rows.length !== 1) { const error = new Error('Site unavailable'); error.statusCode = 404; throw error; }
  return result.rows[0].id;
}
async function saveSiteReadings(site, readingDate, payload, company = currentCompany(), lease, db = runtime().db) {
  if (!payload || !Array.isArray(payload.meters)) throw new Error('Invalid OBM readings');
  const connection = await db.connect();
  try {
    await connection.query('BEGIN');
    const locationId = await requireSite(site, company, connection);
    for (const meter of payload.meters) {
      if (typeof meter.serial !== 'string' || !Array.isArray(meter.readings)) throw new Error('Invalid OBM meter');
      const device = await ownedDevice(connection, meter.serial, company);
      const mapping = await connection.query(`SELECT m.id FROM energy_meter m
        JOIN energy_group g ON g.id = m.group_id JOIN energy_level l ON l.id = g.level_id
        WHERE m.meter_ref_id = $1 AND l.location_id = $2 AND m.is_active = TRUE`, [meter.serial, locationId]);
      if (mapping.rows.length !== 1) throw new Error('Meter not mapped to tenant site');
      for (const reading of meter.readings) {
        if (!reading || !/^\d{2}:\d{2}(:\d{2})?$/.test(reading.time || '')) throw new Error('Invalid reading time');
        const timestamp = new Date(`${readingDate}T${reading.time.length === 5 ? reading.time + ':00' : reading.time}Z`);
        if (!Number.isFinite(timestamp.getTime())) throw new Error('Invalid reading timestamp');
        const data = Object.entries(reading).filter(([key]) => key !== 'time').map(([key, value]) => ({ key: `${meter.serial}_${key}`, value }));
        await lease?.assertOwned(); await assertCurrentLease();
        await connection.query(`INSERT INTO rawdata_energy (id, ref_account, data, created_at, created_date, created_time, type)
          VALUES ($1, $2, $3::jsonb, $4, $5, $6::time, 'live') ON CONFLICT (id) DO NOTHING`,
        [eventId('obm', company, meter.serial, timestamp.toISOString()), Number(device.ref_account), JSON.stringify(data), timestamp, readingDate, reading.time]);
      }
    }
    await lease?.assertOwned(); await connection.query('COMMIT');
  } catch (error) { await connection.query('ROLLBACK'); throw error; }
  finally { connection.release(); }
}
async function ingestSiteReadings(site, date = getDateString(), company = currentCompany(), lease) {
  await requireSite(site, company);
  const payload = await upstream.get('/readings/get-site-readings', { site, date }, { company, signal: lease?.signal });
  await saveSiteReadings(site, date, payload, company, lease);
}
async function runReadingsIngestion(company = currentCompany(), lease) {
  let failed = false;
  for (const site of await getActiveSites(company)) {
    try { await ingestSiteReadings(site, getDateString(), company, lease); }
    catch { failed = true; console.error(JSON.stringify({ event: 'obm-site-readings-failed', company_id: company })); }
  }
  if (failed) throw new Error('One or more tenant sites failed');
}
async function runJob(job, periodMs, work, service = runtime()) {
  const rows = await service.loader.list(['obm']);
  return runPerCompany({ loader: { companies: async () => rows.map(row => Number(row.company_id)) }, leases: service.leases,
    job, periodMs, work });
}
function startScheduledJobs() {
  const log = entry => console.error(JSON.stringify(entry));
  const timer = schedule(async () => {
    // Sites must exist before readings are fetched; each company has its own error boundary and lock.
    await runJob('obm-sites', env.siteSyncIntervalMs, syncSites);
    await runJob('obm-readings', env.readingIngestionIntervalMs, runReadingsIngestion);
  }, 60000, log);
  return timer;
}
module.exports = { getDateString, syncSites, getActiveSites, requireSite, saveSiteReadings, ingestSiteReadings, runReadingsIngestion, runJob, startScheduledJobs };
