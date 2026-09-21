const env = require('../config/env');

function getYesterdayDateValue(date = new Date()) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

function buildMockEnergyReadings(dateValue) {
  const readings = [];
  const baseImport = 3583.3;
  const baseExport = 8.9;

  for (let index = 0; index < 48; index += 1) {
    const readingTime = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`;
    const importKwh = Number((baseImport + index * 0.4).toFixed(1));
    const exportKwh = Number((baseExport + index * 0.05).toFixed(1));
    const totalKwh = Number((importKwh + exportKwh).toFixed(1));

    readings.push({
      time: readingTime,
      import_kwh: importKwh,
      export_kwh: exportKwh,
      total_kwh: totalKwh,
      date: dateValue
    });
  }

  return readings;
}

function buildMockEnergyPayload(date = new Date()) {
  const dateValue = getYesterdayDateValue(date);

  return {
    site: env.mockEnergySite,
    date: dateValue,
    meters: [
      {
        serial: env.mockEnergyMeterSerial,
        subGroup: env.mockEnergySubGroup,
        meterGroup: env.mockEnergyMeterGroup,
        readings: buildMockEnergyReadings(dateValue)
      }
    ]
  };
}

async function postMockEnergyPayload(payload) {
  const url = new URL('/energy/', env.processorBaseUrl);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(`Mock energy delivery failed (${response.status})`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function sendMockEnergyReading(date = new Date()) {
  const payload = buildMockEnergyPayload(date);
  const response = await postMockEnergyPayload(payload);

  console.log(`[energy] Sent mock payload to processor for site=${payload.site}`);
  return response;
}

function startMockEnergyIngestion() {
  return sendMockEnergyReading().catch((error) => {
    console.error(`[energy] Run failed: ${error.message}`);
    throw error;
  });
}

module.exports = {
  buildMockEnergyPayload,
  sendMockEnergyReading,
  startMockEnergyIngestion
};