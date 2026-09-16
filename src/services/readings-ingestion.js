const env = require('../config/env');
const { pool } = require('../config/database');
const upstreamClient = require('./upstream-client');

function getDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function syncSites() {
  const sites = await upstreamClient.get('/readings/list');

  if (!Array.isArray(sites)) {
    throw new Error('Upstream site list response must be an array');
  }

  for (const site of sites) {
    if (!site.SerialNumber) {
      console.warn('[sites] Skipping site without SerialNumber');
      continue;
    }

    await pool.query(
      `
        INSERT INTO energy_location (id, code, name, is_active, created_at, updated_at)
        VALUES (uuid_generate_v4(), $1, $2, TRUE, NOW(), NOW())
        ON CONFLICT (code)
        DO UPDATE SET name = EXCLUDED.name,
          is_active = TRUE,
          updated_at = NOW()
      `,
      [site.SerialNumber || site.code || site.name || 'unknown-site', site.Name || site.name || site.SerialNumber || 'Unknown Site']
    );
  }

  console.log(`[sites] Synchronized ${sites.length} site records`);
  return sites.length;
}

async function getActiveSites() {
  const result = await pool.query(
    'SELECT code AS site_name FROM energy_location WHERE is_active = TRUE ORDER BY code'
  );
  return result.rows.map((row) => row.site_name);
}

async function saveSiteReadings(siteName, readingDate, payload) {
  if (!payload || !Array.isArray(payload.meters)) {
    throw new Error(`Invalid readings response for site ${siteName}`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const meter of payload.meters) {
      if (!meter.serial || !Array.isArray(meter.readings)) continue;

      for (const reading of meter.readings) {
        await client.query(
          `
            INSERT INTO rawdata_energy (
              id,
              meter_ref_id,
              device_type,
              plc_id,
              string_id,
              comm_status,
              readings,
              created_date,
              created_time,
              created_at
            )
            VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6::jsonb, $7, $8::time, NOW())
          `,
          [
            meter.serial || siteName,
            meter.deviceType || 'meter',
            meter.plcId || 'unknown',
            siteName,
            meter.commStatus || 'ok',
            JSON.stringify(reading),
            readingDate,
            reading.time || '00:00:00'
          ]
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function ingestSiteReadings(siteName, readingDate = getDateString()) {
  const payload = await upstreamClient.get('/readings/get-site-readings', {
    site: siteName,
    date: readingDate
  });
  await saveSiteReadings(siteName, readingDate, payload);
  return { site: siteName, readingDate };
}

async function runSiteSync() {
  try {
    await syncSites();
  } catch (error) {
    console.error(`[sites] Synchronization failed: ${error.message}`);
  }
}

async function runReadingsIngestion() {
  const sites = await getActiveSites();
  const readingDate = getDateString();
  const results = await Promise.allSettled(sites.map((site) => ingestSiteReadings(site, readingDate)));
  const failed = results.filter((result) => result.status === 'rejected');
  failed.forEach((result, index) => {
    console.error(`[ingestion] Failed for site ${sites[index]}: ${result.reason.message}`);
  });
  const summary = { attempted: results.length, succeeded: results.length - failed.length, failed: failed.length };
  console.log(`[ingestion] Completed: ${JSON.stringify(summary)} date=${readingDate}`);
  return summary;
}

function startScheduledJobs() {
  let isRunning = false;

  const run = async () => {
    if (isRunning) {
      console.warn('[ingestion] Previous run is still active; skipping this interval');
      return;
    }

    isRunning = true;
    try {
      await runReadingsIngestion();
    } catch (error) {
      console.error(`[ingestion] Run failed: ${error.message}`);
    } finally {
      isRunning = false;
    }
  };

  void runSiteSync();
  void run();
  const siteSyncTimer = setInterval(runSiteSync, env.siteSyncIntervalMs);
  const readingTimer = setInterval(run, env.readingIngestionIntervalMs);
  siteSyncTimer.unref();
  readingTimer.unref();
  return { siteSyncTimer, readingTimer };
}

module.exports = {
  getDateString,
  syncSites,
  getActiveSites,
  saveSiteReadings,
  ingestSiteReadings,
  runReadingsIngestion,
  startScheduledJobs
};