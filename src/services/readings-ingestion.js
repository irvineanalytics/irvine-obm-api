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
        INSERT INTO obm_sites (site_name, modem_dtu, meter_id, raw_data, synced_at)
        VALUES ($1, $2, $3, $4::jsonb, NOW())
        ON CONFLICT (site_name)
        DO UPDATE SET modem_dtu = EXCLUDED.modem_dtu,
          meter_id = EXCLUDED.meter_id, raw_data = EXCLUDED.raw_data,
          is_active = TRUE, synced_at = EXCLUDED.synced_at
      `,
      [site.SerialNumber, site.ModemDTU || null, site.MeterID || null, JSON.stringify(site)]
    );
  }

  console.log(`[sites] Synchronized ${sites.length} site records`);
  return sites.length;
}

async function getActiveSites() {
  const result = await pool.query(
    'SELECT site_name FROM obm_sites WHERE is_active = TRUE ORDER BY site_name'
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
            INSERT INTO obm_readings (
              site_name, reading_date, meter_serial, sub_group, meter_group,
              reading_time, import_kwh, export_kwh, total_kwh, raw_data, fetched_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::time, $7, $8, $9, $10::jsonb, NOW())
            ON CONFLICT (site_name, reading_date, meter_serial, reading_time)
            DO UPDATE SET sub_group = EXCLUDED.sub_group, meter_group = EXCLUDED.meter_group,
              import_kwh = EXCLUDED.import_kwh, export_kwh = EXCLUDED.export_kwh,
              total_kwh = EXCLUDED.total_kwh, raw_data = EXCLUDED.raw_data,
              fetched_at = EXCLUDED.fetched_at
          `,
          [siteName, readingDate, meter.serial, meter.subGroup || null, meter.meterGroup || null,
            reading.time, reading.import_kwh ?? null, reading.export_kwh ?? null,
            reading.total_kwh ?? null, JSON.stringify(reading)]
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