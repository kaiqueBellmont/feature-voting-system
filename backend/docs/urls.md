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
| GET | `/api/features/` | No | List all features ordered by vote count |
| POST | `/api/features/` | Yes | Submit a new feature request |
| GET | `/api/features/{id}/` | No | Retrieve a single feature |
| POST | `/api/features/{id}/vote/` | Yes | Upvote a feature |
| DELETE | `/api/features/{id}/vote/` | Yes | Remove your vote from a feature |

---

## Request & Response Reference

### POST `/api/token/`

Standard simplejwt login endpoint.

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

**Response `401` — invalid or expired refresh token:**
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
> To fully invalidate refresh tokens server-side, token blacklisting can be enabled via simplejwt's `BLACKLIST_AFTER_ROTATION` setting.

---

### GET `/api/auth/me/`

No request body required. Requires `Authorization: Bearer <access_token>` header.

**Response `200`:**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Response `401` — missing or invalid token:**
```json
{
  "detail": "Not authenticated."
}
```

---

### GET `/api/features/`

No request body required.

**Response `200`:**
```json
[
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
    "user_has_voted": true,
    "created_at": "2026-03-24T00:00:00Z",
    "updated_at": "2026-03-24T00:00:00Z"
  }
]
```

> `user_has_voted` is always `false` for unauthenticated requests.
> List is ordered by `vote_count` descending.

---

### POST `/api/features/`

Requires `Authorization: Bearer <access_token>` header.

**Request body:**
```json
{
  "title": "Dark mode",
  "description": "Add a dark mode option to the UI."
}
```

> `author` is set automatically from the JWT identity — do not send it in the request body.
> `status` defaults to `open` if omitted.

**Response `201`:** single feature object (same shape as list item).

---

### GET `/api/features/{id}/`

No request body required.

**Response `200`:** single feature object (same shape as list item).
**Response `404`:** feature not found.

---

### POST `/api/features/{id}/vote/`

Requires `Authorization: Bearer <access_token>` header.

No request body required.

**Response `201`:** empty body — vote recorded.

**Response `400` — already voted:**
```json
{
  "detail": "Already voted."
}
```

**Response `400` — voting on own feature:**
```json
{
  "detail": "You cannot vote on your own feature."
}
```

---

### DELETE `/api/features/{id}/vote/`

Requires `Authorization: Bearer <access_token>` header.

No request body required.

**Response `204`:** empty body — vote removed.

**Response `404`:** vote not found.

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
| `vote_count` | integer | annotated, not stored |
| `user_has_voted` | boolean | computed per request |
| `created_at` | datetime | auto |
| `updated_at` | datetime | auto-updated on save |

### Vote
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | auto |
| `feature` | FK → Feature | |
| `user` | FK → User | set from JWT identity |
| `created_at` | datetime | auto |

> Unique constraint on `(feature, user)` — one vote per user per feature.

---

## Business Rules

| # | Rule |
|---|------|
| 1 | A user cannot vote on a feature they authored. |
| 2 | A user can only vote once per feature. Attempting a second vote returns `400`. |
| 3 | Only authenticated users can submit features or cast/remove votes. |
| 4 | `author` is always derived from the JWT token — it cannot be set or spoofed via the request body. |
| 5 | `user` on a vote is always derived from the JWT token — it cannot be set via the request body. |
| 6 | Features are always returned ordered by `vote_count` descending (most popular first). |
| 7 | `user_has_voted` is always `false` for unauthenticated requests. |
| 8 | Deleting a feature cascades and removes all associated votes. |
| 9 | Deleting a user cascades and removes all their features and votes. |
| 10 | `status` can only be one of: `open`, `planned`, `in_progress`, `completed`, `rejected`. |
| 11 | Logout is stateless — the server issues no invalidation. The client must discard both tokens. |
| 12 | Access tokens are short-lived. Use the refresh token via `/api/token/refresh/` to obtain a new one. |
