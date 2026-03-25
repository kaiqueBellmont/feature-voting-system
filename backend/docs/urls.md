# API Documentation

Base URL: `/api/`

---

## Authentication

JWT-based authentication via `djangorestframework-simplejwt`.

Authenticated requests must include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via `/api/token/` (login) or `/api/auth/register/`.
Access tokens are short-lived; use `/api/token/refresh/` with the refresh token to get a new one.
Logout is stateless — the server has no state to clear; the frontend is responsible for discarding tokens.

---

## Endpoints

### Token (JWT)

| Method | URL | Auth Required | Description |
|--------|-----|:---:|-------------|
| POST | `/api/token/` | No | Obtain access + refresh tokens (login) |
| POST | `/api/token/refresh/` | No | Obtain a new access token using a refresh token |

### Auth

| Method | URL | Auth Required | Description |
|--------|-----|:---:|-------------|
| POST | `/api/auth/register/` | No | Register a new user and return JWT tokens |
| POST | `/api/auth/logout/` | No | Stateless logout (discard tokens on client) |
| GET | `/api/auth/me/` | Yes | Return the authenticated user's data |

### Features

| Method | URL | Auth Required | Description |
|--------|-----|:---:|-------------|
| GET | `/api/features/` | No | Paginated list of features (10/page) |
| POST | `/api/features/` | Yes | Submit a new feature request |
| GET | `/api/features/{id}/` | No | Retrieve a single feature |
| DELETE | `/api/features/{id}/` | Yes (author only) | Delete a feature |
| POST | `/api/features/{id}/vote/` | Yes | Upvote a feature |
| DELETE | `/api/features/{id}/vote/` | Yes | Remove your vote from a feature |

#### Query parameters — `GET /api/features/`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Results per page (default: 10, max: 100) |
| `search` | string | Full-text search on `title` and `description` |
| `ordering` | string | `vote_count`, `-vote_count`, `created_at`, `-created_at` |

### Notifications

| Method | URL | Auth Required | Description |
|--------|-----|:---:|-------------|
| GET | `/api/notifications/` | Yes | Paginated list of notifications for the current user |
| PATCH | `/api/notifications/{id}/` | Yes (owner only) | Mark a single notification as read/unread |
| GET | `/api/notifications/unread_count/` | Yes | Return `{ "count": N }` |
| POST | `/api/notifications/mark_all_read/` | Yes | Mark all notifications as read |

#### Query parameters — `GET /api/notifications/`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `unread` | `true` | If present, return only unread notifications |

#### Response header — `GET /api/notifications/`

| Header | Description |
|--------|-------------|
| `X-Unread-Count` | Total unread notification count for the current user |

---

## WebSocket

### `ws://host/ws/notifications/?token=<access_token>`

Server → client only. The server pushes notifications; incoming messages from the client are ignored.

**Connect:** pass the JWT access token as a query string parameter.

```
ws://localhost:8000/ws/notifications/?token=eyJhbGc...
```

If the token is missing or invalid, the server closes the connection immediately.

**Message payload (server → client):**
```json
{
  "id": 12,
  "type": "vote",
  "type_display": "Someone voted on your feature",
  "feature": 3,
  "feature_title": "Dark mode",
  "message": "johndoe voted on your feature 'Dark mode'",
  "is_read": false,
  "created_at": "2026-03-25T19:00:00Z"
}
```

---

## Request & Response Reference

### POST `/api/token/`

**Request body:**
```json
{
  "username": "johndoe",
  "password": "securepassword"
}
```

**Response `200`:**
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>"
}
```

**Response `401` — invalid credentials:**
```json
{
  "detail": "No active account found with the given credentials"
}
```

---

### POST `/api/token/refresh/`

**Request body:**
```json
{
  "refresh": "<refresh_token>"
}
```

**Response `200`:**
```json
{
  "access": "<new_access_token>"
}
```

**Response `400` — missing or expired refresh token:**
```json
{
  "detail": "Token is invalid or expired",
  "code": "token_not_valid"
}
```

---

### POST `/api/auth/register/`

**Request body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response `201`:**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2026-03-24T00:00:00Z"
  },
  "access": "<access_token>",
  "refresh": "<refresh_token>"
}
```

> Tokens are issued immediately on registration — no separate login step required.

---

### POST `/api/auth/logout/`

No request body required.

**Response `200`:** empty body.

> JWT logout is stateless. The server performs no action. The client must discard the access and refresh tokens.

---

### GET `/api/auth/me/`

Requires `Authorization: Bearer <access_token>`.

**Response `200`:**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2026-03-24T00:00:00Z"
}
```

---

### GET `/api/features/`

**Response `200`:**
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/features/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Dark mode",
      "description": "Add a dark mode option to the UI.",
      "author": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "created_at": "2026-03-24T00:00:00Z"
      },
      "status": "open",
      "vote_count": 42,
      "rank": 1,
      "user_has_voted": true,
      "created_at": "2026-03-24T00:00:00Z",
      "updated_at": "2026-03-24T00:00:00Z"
    }
  ]
}
```

> `user_has_voted` is always `false` for unauthenticated requests.
> `rank` is computed across the full dataset using a SQL window function.

---

### POST `/api/features/`

Requires `Authorization: Bearer <access_token>`.

**Request body:**
```json
{
  "title": "Dark mode",
  "description": "Add a dark mode option to the UI."
}
```

> `author` is set automatically from the JWT identity.
> `status` defaults to `open`.

**Response `201`:** single feature object (same shape as list item).

---

### GET `/api/features/{id}/`

**Response `200`:** single feature object.
**Response `404`:** feature not found.

---

### DELETE `/api/features/{id}/`

Requires `Authorization: Bearer <access_token>`. Only the feature author may delete.

**Response `204`:** deleted.
**Response `403`:** not the author.

---

### POST `/api/features/{id}/vote/`

Requires `Authorization: Bearer <access_token>`.

**Response `201`:** vote recorded.

**Response `400` — already voted:**
```json
{ "detail": "Already voted." }
```

**Response `400` — own feature:**
```json
{ "detail": "You cannot vote on your own feature." }
```

---

### DELETE `/api/features/{id}/vote/`

Requires `Authorization: Bearer <access_token>`.

**Response `204`:** vote removed.
**Response `404`:** vote not found.

---

### GET `/api/notifications/`

Requires `Authorization: Bearer <access_token>`.

**Response `200`:**
```json
{
  "count": 8,
  "next": "http://localhost:8000/api/notifications/?page=2",
  "previous": null,
  "results": [
    {
      "id": 12,
      "type": "vote",
      "type_display": "Someone voted on your feature",
      "feature": 3,
      "feature_title": "Dark mode",
      "message": "johndoe voted on your feature 'Dark mode'",
      "is_read": false,
      "created_at": "2026-03-25T19:00:00Z"
    }
  ]
}
```

Response header: `X-Unread-Count: 3`

---

### PATCH `/api/notifications/{id}/`

Requires `Authorization: Bearer <access_token>`. Only the notification recipient may update.

**Request body:**
```json
{ "is_read": true }
```

**Response `200`:** updated notification object.
**Response `403`:** not the recipient.

---

### GET `/api/notifications/unread_count/`

Requires `Authorization: Bearer <access_token>`.

**Response `200`:**
```json
{ "count": 3 }
```

---

### POST `/api/notifications/mark_all_read/`

Requires `Authorization: Bearer <access_token>`.

**Response `200`:** all notifications for the current user marked as read.

---

## Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | auto |
| `username` | string | unique |
| `email` | string | |
| `password` | string | write-only, hashed |
| `created_at` | datetime | auto |

### Feature
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | auto |
| `title` | string | max 255 chars |
| `description` | string | max 1000 chars |
| `author` | FK → User | set from JWT identity on create |
| `status` | enum | `open`, `planned`, `in_progress`, `completed`, `rejected` — default `open` |
| `vote_count` | integer | annotated via `COUNT(votes)`, not stored |
| `rank` | integer | annotated via SQL `RANK()` window function |
| `user_has_voted` | boolean | computed per request |
| `created_at` | datetime | auto |
| `updated_at` | datetime | auto-updated on save |

### Vote
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | auto |
| `feature` | FK → Feature | cascade delete |
| `user` | FK → User | set from JWT identity |
| `created_at` | datetime | auto |

> Unique constraint on `(feature, user)` — one vote per user per feature.

### Notification
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | auto |
| `recipient` | FK → User | cascade delete |
| `type` | enum | `vote`, `status`, `comment` |
| `feature` | FK → Feature | cascade delete |
| `message` | string | max 255 chars |
| `is_read` | boolean | default `false`, indexed |
| `created_at` | datetime | auto, ordered descending |

> Composite index on `(recipient, is_read)` for efficient unread queries.

---

## Business Rules

| # | Rule |
|---|------|
| 1 | A user cannot vote on a feature they authored. |
| 2 | A user can only vote once per feature. Attempting a second vote returns `400`. |
| 3 | Only authenticated users can submit features or cast/remove votes. |
| 4 | `author` is always derived from the JWT token — it cannot be set or spoofed via the request body. |
| 5 | `user` on a vote is always derived from the JWT token — it cannot be set via the request body. |
| 6 | Features support ordering by `vote_count` and `created_at` (ascending and descending). |
| 7 | `user_has_voted` is always `false` for unauthenticated requests. |
| 8 | Deleting a feature cascades and removes all associated votes and notifications. |
| 9 | Deleting a user cascades and removes all their features, votes, and notifications. |
| 10 | `status` can only be one of: `open`, `planned`, `in_progress`, `completed`, `rejected`. |
| 11 | Logout is stateless — the server issues no invalidation. The client must discard both tokens. |
| 12 | Access tokens are short-lived. Use the refresh token via `/api/token/refresh/` to obtain a new one. |
| 13 | Notifications are only created when a third party votes — self-votes never trigger a notification. |
| 14 | A notification recipient is the only user who may mark it as read (`PATCH /{id}/`). |
| 15 | WebSocket connections are authenticated via JWT token in the query string. Invalid tokens are rejected immediately. |
