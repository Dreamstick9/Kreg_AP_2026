# Kreg Lite API

Based on the [Heartbeat Team guide](https://github.com/Dreamstick9/heartbeat/blob/main/plan.js).

- Base URL: `http://localhost:3000`. Send request bodies as JSON.
- Protected routes need `Authorization: Bearer <token>`. Tokens last 7 days.
- Success: `{ "data": ... }`. Error: `{ "error": "message" }`.
- The guide’s exceptions are `/healthz` (`{ "ok": true }`) and DELETE (204, no body).
- Monitor IDs that are invalid, missing, or belong to another user return 404.
- Examples show the agreed contract; some routes are built in later tasks.

Common error examples:

| Status | Example body |
| --- | --- |
| 400 | `{ "error": "intervalSec: must be an integer from 10 to 3600" }` |
| 401 | `{ "error": "Missing token" }` or `{ "error": "Invalid or expired token" }` |
| 404 | `{ "error": "Monitor not found" }` |
| 409 | `{ "error": "Email already registered" }` |
| 500 | `{ "error": "Something went wrong" }` |

## 1. GET /healthz

**Token:** No.

Checks whether the API is running. KL-06 adds a database check.

**Request body:** None.

**Success — 200 OK:**

```json
{ "ok": true }
```

**Errors:** 500 — database unavailable: `{ "ok": false }`.

## 2. POST /api/v1/auth/register

**Token:** No.

Name, email, and password are required. Email must contain `@`; password needs at least 6 characters.

**Request body:**

```json
{ "name": "Madhav", "email": "madhav@example.com", "password": "sample1234" }
```

**Success — 201 Created:**

```json
{
  "data": { "token": "<jwt>", "user": { "id": 2, "name": "Madhav", "email": "madhav@example.com" } }
}
```

**Errors:** 400 — invalid input; 409 — email already registered; 500 — server error.

## 3. POST /api/v1/auth/login

**Token:** No.

An unknown email and a wrong password both return `Invalid email or password`.

**Request body:**

```json
{ "email": "demo@kreg.dev", "password": "demo1234" }
```

**Success — 200 OK:**

```json
{ "data": { "token": "<jwt>", "user": { "id": 1, "name": "Demo", "email": "demo@kreg.dev" } } }
```

**Errors:** 401 — invalid email or password; 500 — server error.

## 4. GET /api/v1/auth/me

**Token:** Required.

Returns the logged-in user. Password hashes are never returned.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": { "id": 1, "name": "Demo", "email": "demo@kreg.dev", "createdAt": "2026-11-13T08:00:00.000Z" }
}
```

**Errors:** 401 — missing or invalid token; 500 — server error.

## 5. POST /api/v1/monitors

**Token:** Required.

Name and URL are required. Name: 1–100 characters; URL: HTTP or HTTPS. `intervalSec`: 10–3600 (default 60); `isPublic`: boolean (default false).

**Request body:**

```json
{ "name": "Fake Flaky", "url": "http://localhost:4000/flaky", "intervalSec": 10, "isPublic": true }
```

**Success — 201 Created:**

```json
{
  "data": {
    "id": 3,
    "userId": 1,
    "name": "Fake Flaky",
    "url": "http://localhost:4000/flaky",
    "intervalSec": 10,
    "isActive": true,
    "isPublic": true,
    "status": "UNKNOWN",
    "consecutiveFailures": 0,
    "lastCheckedAt": null,
    "createdAt": "2026-11-13T08:00:00.000Z"
  }
}
```

**Errors:** 400 — invalid input; 401 — missing or invalid token; 500 — server error.

## 6. GET /api/v1/monitors?page=1&limit=10

**Token:** Required.

Lists your monitors, newest first. `page` defaults to 1; `limit` defaults to 10, maximum 50.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": [
    {
      "id": 3,
      "userId": 1,
      "name": "Fake Flaky",
      "url": "http://localhost:4000/flaky",
      "intervalSec": 10,
      "isActive": true,
      "isPublic": true,
      "status": "UP",
      "consecutiveFailures": 0,
      "lastCheckedAt": "2026-11-13T09:00:00.000Z",
      "createdAt": "2026-11-13T08:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

**Errors:** 401 — missing or invalid token; 500 — server error.

## 7. GET /api/v1/monitors/:id

**Token:** Required.

`openIncident` is the unresolved incident, or `null` when there is none.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": {
    "id": 3,
    "userId": 1,
    "name": "Fake Flaky",
    "url": "http://localhost:4000/flaky",
    "intervalSec": 10,
    "isActive": true,
    "isPublic": true,
    "status": "UP",
    "consecutiveFailures": 0,
    "lastCheckedAt": "2026-11-13T09:00:00.000Z",
    "createdAt": "2026-11-13T08:00:00.000Z",
    "openIncident": null
  }
}
```

**Errors:** 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 8. PATCH /api/v1/monitors/:id

**Token:** Required.

Update only fields sent among `name`, `url`, `intervalSec`, `isActive`, and `isPublic`. Other fields are ignored. Creation validation rules apply; both flags must be booleans.

**Request body:**

```json
{ "name": "Flaky demo", "intervalSec": 30, "isActive": false }
```

**Success — 200 OK:**

```json
{
  "data": {
    "id": 3,
    "userId": 1,
    "name": "Flaky demo",
    "url": "http://localhost:4000/flaky",
    "intervalSec": 30,
    "isActive": false,
    "isPublic": true,
    "status": "UP",
    "consecutiveFailures": 0,
    "lastCheckedAt": "2026-11-13T09:00:00.000Z",
    "createdAt": "2026-11-13T08:00:00.000Z"
  }
}
```

**Errors:** 400 — invalid input; 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 9. DELETE /api/v1/monitors/:id

**Token:** Required.

Also deletes this monitor’s results and incidents.

**Request body:** None.

**Success — 204 No Content:**

Empty response body.

**Errors:** 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 10. GET /api/v1/monitors/:id/results?limit=50

**Token:** Required.

Newest first. `limit` defaults to 50, maximum 200. No results returns an empty array.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": [
    {
      "id": 42,
      "monitorId": 3,
      "isUp": false,
      "statusCode": 503,
      "responseTimeMs": 12,
      "error": "HTTP 503",
      "checkedAt": "2026-11-13T09:00:00.000Z"
    }
  ]
}
```

**Errors:** 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 11. GET /api/v1/monitors/:id/incidents

**Token:** Required.

Newest first. `resolvedAt: null` means the incident is open. No incidents returns an empty array.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": [
    {
      "id": 1,
      "monitorId": 3,
      "reason": "HTTP 503",
      "startedAt": "2026-11-13T09:00:00.000Z",
      "resolvedAt": "2026-11-13T09:01:00.000Z"
    }
  ]
}
```

**Errors:** 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 12. POST /api/v1/monitors/:id/check

**Token:** Required.

Runs and saves a check now. A failed target still returns API status 200, with `isUp: false`.

**Request body:** None.

**Success — 200 OK:**

```json
{ "data": { "isUp": false, "statusCode": 503, "responseTimeMs": 12, "error": "HTTP 503" } }
```

**Errors:** 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 13. GET /api/v1/monitors/:id/stats

**Token:** Required.

`uptime24h` is a percentage; `avgMs24h` is in milliseconds. With no checks, both are `null` and `totalChecks24h` is 0. `daily` has up to 7 days (oldest first); `movingAvg` has up to 50 successful checks (newest first), averaging each check with up to 4 before it.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": {
    "uptime24h": 80,
    "avgMs24h": 15,
    "totalChecks24h": 10,
    "daily": [{ "day": "2026-11-13", "checks": 10, "uptimePct": 80 }],
    "movingAvg": [{ "checkedAt": "2026-11-13T09:00:00.000Z", "responseTimeMs": 15, "movingAvgMs": 15 }]
  }
}
```

**Errors:** 401 — missing or invalid token; 404 — monitor not found or not yours; 500 — server error.

## 14. GET /api/v1/stats/overview

**Token:** Required.

Only your monitors: speed ranking for the last 24 hours, total incident downtime in seconds, and monitors whose latest check failed. Open incidents count until now. Arrays may be empty.

**Request body:** None.

**Success — 200 OK:**

```json
{
  "data": {
    "ranking": [{ "id": 3, "name": "Fake Flaky", "avgMs": 15, "speedRank": 1 }],
    "downtime": [{ "name": "Fake Flaky", "incidents": 1, "downtimeSec": 60 }],
    "failingNow": [
      {
        "name": "Fake Flaky",
        "statusCode": 503,
        "error": "HTTP 503",
        "checkedAt": "2026-11-13T09:02:00.000Z"
      }
    ]
  }
}
```

**Errors:** 401 — missing or invalid token; 500 — server error.

## 15. GET /api/v1/status

**Token:** No.

Public monitors from all users, with exactly these five fields. Uptime and average time can be `null` if there are no checks.

**Request body:** None.

**Success — 200 OK:**

```json
{ "data": [{ "id": 3, "name": "Fake Flaky", "status": "UP", "uptime24h": 80, "avgMs24h": 15 }] }
```

**Errors:** 500 — server error.
