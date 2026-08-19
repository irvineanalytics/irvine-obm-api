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

Use Swagger UI to test endpoints by filling query parameters directly (including `apiAccessToken` for protected routes).

## Base Endpoints

- `GET /` - API status
- `GET /api/v1/readings/request-token?username=...&password=...` - Request token
- `GET /api/v1/readings/list?apiAccessToken=...` - List modem and meter info
- `GET /api/v1/readings/get-all-accounts-by-group?apiAccessToken=...` - List all accounts by group
- `GET /api/v1/readings/get-accounts-by-sub-group?apiAccessToken=...&subgroup=...` - List accounts by subgroup
- `GET /api/v1/readings/get-site-readings?apiAccessToken=...&site=...&date=YYYY-MM-DD` - Get site readings by date
- `GET /api/v1/readings/get-site-daily?apiAccessToken=...&site=...&date=YYYY-MM-DD` - Get site daily readings by date
- `GET /api/v1/health?apiAccessToken=...` - Health check (token required)

## Authentication

All API endpoints require an `apiAccessToken`, except:

- `GET /api/v1/readings/request-token`

### Request Token

Example:

```bash
curl "http://localhost:3000/api/v1/readings/request-token?username=APIdemo1!&password=OBapi1!"
```

Response:

```json
{
   "access-token": "<generated-token>"
}
```

Tokens are valid for 24 hours by default (`TOKEN_TTL_HOURS`).

## Common Parameters

- `apiAccessToken`
   - Required for all API requests except obtaining a token
   - Must be included as a query parameter in the URL
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

Query parameter style:

```bash
curl "http://localhost:3000/api/v1/health?apiAccessToken=<generated-token>"
```

Meter operations:

```bash
curl "http://localhost:3000/api/v1/readings/list?apiAccessToken=<generated-token>"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-readings?apiAccessToken=<generated-token>&site=Heywood"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-readings?apiAccessToken=<generated-token>&site=Heywood&date=2026-08-18"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-daily?apiAccessToken=<generated-token>&site=Heywood"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-site-daily?apiAccessToken=<generated-token>&site=Heywood&date=2026-08-18"
```

Account operations:

```bash
curl "http://localhost:3000/api/v1/readings/get-all-accounts-by-group?apiAccessToken=<generated-token>"
```

```bash
curl "http://localhost:3000/api/v1/readings/get-accounts-by-sub-group?apiAccessToken=<generated-token>&subgroup=Subgroup%201"
```
