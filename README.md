# Irvine OBM API

OBM credentials and endpoints are loaded per company from `tenant_integration`
and Azure Key Vault. There are no demo credentials or automatic mock readings in
production startup. Node.js 22+, PostgreSQL, Redis and a managed identity with
access to the approved Key Vault are required.

Run `npm ci` and `npm start`. Supply shared database settings (`DATABASE_URL` or
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), `REDIS_URL`,
`KEY_VAULT_ALLOWED_HOSTS`, optional `AZURE_CLIENT_ID`, and `INTERNAL_SERVICE_KEY`.
`PORT` and `API_PREFIX` select the HTTP address. `READING_INGESTION_INTERVAL_MS`
and `SITE_SYNC_INTERVAL_MS` control the shared schedule periods.

Each enabled `obm` integration supplies `base_url`, `username`,
`token_refresh_hours`, and a Key Vault reference containing JSON with `password`.
Tokens are cached separately for each company/configuration revision and never
returned by the API or logged.

`GET /api/v1/health` is public. `/api/v1/readings/*` requires the trusted internal
headers `X-Service-Key` and `X-Company-Id`. Callers must derive the company from
their authenticated server context. A token-refresh request returns metadata.
Site-reading requests also check that the site belongs to that company.

Site and reading jobs run for each enabled company with separate Redis locks and
error handling. Site codes may repeat across companies. Every meter must exist
as an active device in the company's account and in its energy site hierarchy.
Readings use the current Django raw-energy schema and stable IDs for retries.

Run `npm test` for route/token isolation; `npm run test:integration` needs a
throwaway `mt2_*` database in `TEST_DATABASE_URL`. Do not point it at production.
In the parent checkout, `python3 scripts/test_node_tenant_database.py` creates and
removes that database automatically and also tests infrastructure-only startup.

The full configuration, MQTT migration and staging procedure is in
`docs/deployment/tenant-integrations-rollout.md` in the parent Irvine project.
Django owns schema migrations; this service never creates or migrates tables.
