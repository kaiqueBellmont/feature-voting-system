# Running Seeders

## Prerequisites

Make sure you have your virtual environment activated and all dependencies installed:

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

Then apply all migrations:

```bash
python manage.py migrate
```

## How to Run

From the `backend/` directory:

```bash
python seeders/seed.py
```

## What It Creates

### Users

| Username | Email | Password |
|----------|-------|----------|
| `user1` | user1@example.com | `123456` |
| `user2` | user2@example.com | `123456` |

### Features

| Title | Author | Status |
|-------|--------|--------|
| Dark Mode Support | user1 | open |
| Export Data as CSV | user1 | planned |
| Email Notifications | user2 | open |
| Mobile App | user2 | in_progress |

## Behavior

- **Idempotent** — safe to run multiple times. Users and features that already exist are skipped (`get_or_create`), not duplicated.
- Output uses `[+]` for newly created records and `[~]` for already existing ones.

## Expected Output

```
Running seeders...

  [+] User created: user1
  [+] User created: user2
  [+] Feature created: "Dark Mode Support" by user1
  [+] Feature created: "Export Data as CSV" by user1
  [+] Feature created: "Email Notifications" by user2
  [+] Feature created: "Mobile App" by user2

Done.
```

On subsequent runs:

```
Running seeders...

  [~] User already exists: user1
  [~] User already exists: user2
  [~] Feature already exists: "Dark Mode Support"
  [~] Feature already exists: "Export Data as CSV"
  [~] Feature already exists: "Email Notifications"
  [~] Feature already exists: "Mobile App"

Done.
```
