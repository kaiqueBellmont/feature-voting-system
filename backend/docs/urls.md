# API Documentation

Base URL: `/api/`

---

## Authentication

Session-based authentication via Django's built-in session framework.
Authenticated requests require a valid session cookie (set automatically after login/register).

---

## Endpoints

### Auth

| Method | URL | Auth Required | Description |
|--------|-----|:---:|-------------|
| POST | `/api/auth/register/` | No | Register a new user and start a session |
| POST | `/api/auth/login/` | No | Authenticate and start a session |
| POST | `/api/auth/logout/` | No | End the current session |
| GET | `/api/auth/me/` | Yes | Return the authenticated user's data |

---

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
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2026-03-24T00:00:00Z"
}
```

---

### POST `/api/auth/login/`

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
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Response `400` — invalid credentials:**
```json
{
  "detail": "Invalid credentials."
}
```

---

### POST `/api/auth/logout/`

No request body required.
**Response `200`:** empty body.

---

### GET `/api/auth/me/`

No request body required.

**Response `200`:**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Response `401` — not authenticated:**
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

**Request body:**
```json
{
  "title": "Dark mode",
  "description": "Add a dark mode option to the UI."
}
```

> `author` is set automatically from the authenticated session — do not send it in the request.
> `status` defaults to `open` if omitted.

**Response `201`:** same shape as a single feature object (see GET `/api/features/`).

---

### GET `/api/features/{id}/`

No request body required.

**Response `200`:** single feature object (same shape as list item).
**Response `404`:** feature not found.

---

### POST `/api/features/{id}/vote/`

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
| `author` | FK → User | set from session on create |
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
| `user` | FK → User | set from session |
| `created_at` | datetime | auto |

> Unique constraint on `(feature, user)` — one vote per user per feature.

---

## Business Rules

| # | Rule |
|---|------|
| 1 | A user cannot vote on a feature they authored. |
| 2 | A user can only vote once per feature. Attempting a second vote returns `400`. |
| 3 | Only authenticated users can submit features or cast/remove votes. |
| 4 | `author` is always derived from the session — it cannot be set or spoofed via the request body. |
| 5 | `user` on a vote is always derived from the session — it cannot be set via the request body. |
| 6 | Features are always returned ordered by `vote_count` descending (most popular first). |
| 7 | `user_has_voted` is always `false` for unauthenticated requests. |
| 8 | Deleting a feature cascades and removes all associated votes. |
| 9 | Deleting a user cascades and removes all their features and votes. |
| 10 | `status` can only be one of: `open`, `planned`, `in_progress`, `completed`, `rejected`. |
