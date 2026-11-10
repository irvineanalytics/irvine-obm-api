const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { Pool } = require('pg');
const { companyPool, withCompany, ownedDevice, ownedDeviceForCompanies } = require('@irvine/tenant-runtime');
if (!process.env.RLS_DATABASE_URL || !process.env.RLS_FIXTURE) throw new Error('Run the disposable RLS runner');
if (!/^\/(test_|mt2_)/.test(new URL(process.env.RLS_DATABASE_URL).pathname)) throw new Error('A disposable test database is required');
const fixture = JSON.parse(process.env.RLS_FIXTURE);
const { a, b } = fixture;
const raw = new Pool({ connectionString: process.env.RLS_DATABASE_URL, max: 1 });
const db = companyPool(raw);
after(() => db.end());

test('unscoped raw SELECT returns zero rows for the actual runtime login', async () => {
  for (const table of ['accounts', 'devices', 'administrator_user', 'costings', 'rawdata_flowdata']) {
    assert.deepEqual((await db.query(`SELECT id FROM ${table}`)).rows, []);
  }
});

test('concurrent A/B reads stay isolated when a single pool connection is reused', async () => {
  const results = await Promise.all([a, b, a, b].map(company => withCompany(company.company_id,
    () => db.query('SELECT company FROM accounts'))));
  for (const [index, result] of results.entries()) {
    assert.ok(result.rows.length);
    assert.ok(result.rows.every(row => row.company === [a, b][index % 2].company_id));
  }
  assert.deepEqual((await raw.query('SELECT id FROM accounts')).rows, []);
});

test('foreign account writes fail and the connection is safe after errors', async () => {
  await assert.rejects(withCompany(a.company_id, () => db.query(
    `INSERT INTO rawdata_flowdata (ref_account, data, type) VALUES ($1, '[]', 'live')`, [b.account_id])), /row-level security/);
  assert.deepEqual((await db.query('SELECT id FROM accounts')).rows, []);
  await withCompany(a.company_id, async () => {
    const result = await db.query('UPDATE accounts SET name=name WHERE id=$1', [b.account_id]);
    assert.equal(result.rowCount, 0);
  });
});

test('explicit transactions retain company and roll back before pool reuse', async () => {
  await withCompany(a.company_id, async () => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      assert.ok((await client.query('SELECT id FROM accounts')).rows.length);
      await client.query("UPDATE accounts SET name='rolled back'");
      await client.query('ROLLBACK');
    } finally { client.release(); }
  });
  assert.deepEqual((await raw.query('SELECT id FROM accounts')).rows, []);
  await withCompany(b.company_id, async () => {
    assert.ok((await db.query('SELECT name FROM accounts')).rows.every(row => row.name !== 'rolled back'));
  });
});

test('company A cannot resolve company B devices; approved shared groups remain bounded', async () => {
  await assert.rejects(ownedDevice(db, b.device_id, a.company_id), /Device unavailable/);
  assert.equal((await ownedDevice(db, a.device_id, a.company_id)).ref_company, a.company_id);
  assert.equal((await ownedDeviceForCompanies(db, b.device_id, [a.company_id, b.company_id])).ref_company, b.company_id);
  assert.deepEqual((await raw.query('SELECT id FROM devices')).rows, []);
});

const { getActiveSites } = require('../../src/services/readings-ingestion');
test('OBM site lookup cannot return another company site', async () => {
  const sites = await withCompany(a.company_id, () => getActiveSites(a.company_id, db));
  assert.deepEqual(sites, ['rls-site-a']);
});
