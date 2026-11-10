const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
process.env.NODE_ENV = 'test';
const { syncSites, getActiveSites, saveSiteReadings } = require('../../src/services/readings-ingestion');
const url = new URL(process.env.TEST_DATABASE_URL || 'postgresql://localhost/missing');
if (!url.pathname.startsWith('/mt2_')) throw new Error('A disposable mt2_* TEST_DATABASE_URL is required');
const schema = `obm_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: url.toString() });
const db = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema}` });
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await db.query(`
    CREATE TABLE company (id integer PRIMARY KEY, is_active boolean NOT NULL);
    CREATE TABLE accounts (id integer PRIMARY KEY, company integer REFERENCES company(id), is_active boolean NOT NULL, UNIQUE(id,company));
    CREATE TABLE devices (ref_device_id text UNIQUE, ref_company integer REFERENCES company(id), ref_account integer,
      topic text, is_active boolean NOT NULL, FOREIGN KEY(ref_account,ref_company) REFERENCES accounts(id,company));
    CREATE TABLE energy_location (id uuid PRIMARY KEY, company_id integer REFERENCES company(id), code text, name text,
      is_active boolean, created_at timestamp, updated_at timestamp, UNIQUE(company_id,code));
    CREATE TABLE energy_level (id integer PRIMARY KEY, location_id uuid REFERENCES energy_location(id));
    CREATE TABLE energy_group (id integer PRIMARY KEY, level_id integer REFERENCES energy_level(id));
    CREATE TABLE energy_meter (id integer PRIMARY KEY, group_id integer REFERENCES energy_group(id), meter_ref_id text UNIQUE, is_active boolean);
    CREATE TABLE rawdata_energy (id uuid PRIMARY KEY, ref_account integer REFERENCES accounts(id), data jsonb,
      created_at timestamp, created_date date, created_time time, type text);
    INSERT INTO company VALUES(1,true),(2,true);
    INSERT INTO accounts VALUES(10,1,true),(20,2,true);
    INSERT INTO devices VALUES('meter-a',1,10,'company-a/meter-a/data',true),('meter-b',2,20,'company-b/meter-b/data',true);
  `);
});
after(async () => { await db.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
test('same upstream site code can belong to both companies without overwriting their rows', async () => {
  const upstream = name => ({ get: async () => [{ SerialNumber: 'same-site', Name: name }] });
  await Promise.all([syncSites(1, undefined, db, upstream('A site')), syncSites(2, undefined, db, upstream('B site'))]);
  const result = await db.query('SELECT company_id, name FROM energy_location ORDER BY company_id');
  assert.deepEqual(result.rows, [{ company_id: 1, name: 'A site' }, { company_id: 2, name: 'B site' }]);
  assert.deepEqual(await getActiveSites(1, db), ['same-site']);
  assert.deepEqual(await getActiveSites(999, db), []);
  await db.query(`INSERT INTO energy_level SELECT company_id, id FROM energy_location;
    INSERT INTO energy_group VALUES(1,1),(2,2);
    INSERT INTO energy_meter VALUES(1,1,'meter-a',true),(2,2,'meter-b',true);`);
});
test('concurrent readings reach the correct accounts and retries do not duplicate rows', async () => {
  const payload = serial => ({ meters: [{ serial, readings: [{ time: '12:00', energy: 7 }] }] });
  await Promise.all([saveSiteReadings('same-site', '2026-10-01', payload('meter-a'), 1, undefined, db),
    saveSiteReadings('same-site', '2026-10-01', payload('meter-b'), 2, undefined, db)]);
  await saveSiteReadings('same-site', '2026-10-01', payload('meter-a'), 1, undefined, db);
  const result = await db.query('SELECT ref_account, data FROM rawdata_energy ORDER BY ref_account');
  assert.equal(result.rows.length, 2); assert.deepEqual(result.rows.map(row => row.ref_account), [10, 20]);
  assert.equal(result.rows[0].data[0].key, 'meter-a_energy');
});
test('a foreign meter aborts the whole tenant batch with no partial writes', async () => {
  const payload = { meters: [
    { serial: 'meter-a', readings: [{ time: '13:00', energy: 8 }] },
    { serial: 'meter-b', readings: [{ time: '13:00', energy: 9 }] },
  ] };
  await assert.rejects(saveSiteReadings('same-site', '2026-10-01', payload, 1, undefined, db), /Device unavailable/);
  assert.equal(Number((await db.query('SELECT count(*) FROM rawdata_energy')).rows[0].count), 2);
});

test('Company A cannot read a site that only Company B owns', async () => {
  await db.query(`INSERT INTO energy_location (id, company_id, code, name, is_active)
    VALUES ($1, 2, 'b-private', 'Private B site', true)`, [randomUUID()]);
  assert.equal((await getActiveSites(1, db)).includes('b-private'), false);
  assert.equal((await getActiveSites(2, db)).includes('b-private'), true);
});
