# Irvine OBM API

Base Node.js + Express RESTful API scaffold.

## Requirements

- Node.js 18+
- npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start server with nodemon
- `npm start` - Start server

## Swagger Testing

- Swagger UI: `GET /api-docs`
- OpenAPI JSON: `GET /api-docs.json`

Use Swagger UI to test endpoints directly. The API manages upstream `apiAccessToken` automatically.

## Base Endpoints

- `GET /` - API status
- `GET /api/v1/readings/request-token` - Force refresh upstream token
- `GET /api/v1/readings/list` - List modem and meter info
- `GET /api/v1/readings/get-all-accounts-by-group` - List all accounts by group
- `GET /api/v1/readings/get-accounts-by-sub-group?subgroup=...` - List accounts by subgroup
- `GET /api/v1/readings/get-site-readings?site=...&date=YYYY-MM-DD` - Get site readings by date
- `GET /api/v1/readings/get-site-daily?site=...&date=YYYY-MM-DD` - Get site daily readings by date
- `GET /api/v1/health` - Health check

## Authentication Behavior

- On API startup, the server requests an upstream token from `https://meterportal.obmeters.com/readings/request-token`.
- The token is stored in memory and reused for all upstream requests.
- The token is automatically refreshed every `TOKEN_REFRESH_HOURS` (default `12`).
- You can manually trigger refresh with `GET /api/v1/readings/request-token`.

## Common Parameters

- Date format
   - Use `YYYY-MM-DD`
- URL encoding
   - Encode spaces as `%20`

## Error Handling

API responses include standard HTTP status codes:

- `200 OK`: The request was successful
- `400 Bad Request`: The request was invalid or missing parameters
- `401 Unauthorized`: The `apiAccessToken` is missing or invalid
- `403 Forbidden`: Access is denied
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An error occurred on the server

### Use Token

Local API usage:

```bash
curl "http://localhost:3000/api/v1/health"
```

Meter operations:

```bash
curl "http://localhost:3000/api/v1/readings/list"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-readings?site=Heywood"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-readings?site=Heywood&date=2026-08-18"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-daily?site=Heywood"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-daily?site=Heywood&date=2026-08-18"
```

Account operations:

```bash
curl "http://localhost:3000/api/v1/readings/get-all-accounts-by-group"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-accounts-by-sub-group?subgroup=Subgroup%201"
```
