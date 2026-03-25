# Running Tests

## Why pytest instead of unittest

Django's default test runner uses `unittest`, which requires `setUp` and `tearDown` methods on each test class to create and clean up data. This means repeating the same user/feature creation boilerplate across every test file.

We use **pytest-django** instead. It gives us fixtures — functions that create data once and get injected automatically into any test that declares them as parameters. A single `conftest.py` defines `user1`, `user2`, `auth_client1`, `auth_client2`, `feature1`, and `feature2`, and pytest handles setup and teardown (database rollback) automatically between tests.

This means:
- No manual `setUp`/`tearDown`
- No data leaking between tests — each test runs in a transaction that gets rolled back
- Fixtures are composable — `auth_client1` depends on `user1`, which depends on `db`, and pytest resolves the chain automatically
- The same fixture data used in seeds can be mirrored in tests without duplication

---

## Prerequisites

Install dependencies and apply migrations:

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers pytest-django
```

```bash
cd backend
python manage.py migrate
```

---

## Running Tests

All commands should be run from the `backend/` directory.

### Run all tests

```bash
pytest tests/
```

### Run with verbose output

```bash
pytest tests/ -v
```

### Run a specific file

```bash
pytest tests/test_auth.py -v
pytest tests/test_features.py -v
pytest tests/test_votes.py -v
```

### Run a specific test class

```bash
pytest tests/test_votes.py::TestVote -v
```

### Run a single test

```bash
pytest tests/test_votes.py::TestVote::test_vote_own_feature_returns_400 -v
```

### Stop on first failure

```bash
pytest tests/ -x
```

### Show local variables on failure

```bash
pytest tests/ -v --tb=short
```

---

## Test Structure

```
backend/
├── pytest.ini               ← points pytest to core.settings
└── tests/
    ├── conftest.py          ← shared fixtures (users, auth clients, features)
    ├── test_auth.py         ← register, me, logout
    ├── test_features.py     ← list, retrieve, create, ordering, user_has_voted
    └── test_votes.py        ← vote, unvote, business rules
```

### conftest.py fixtures

| Fixture | Type | Description |
|---------|------|-------------|
| `api_client` | `APIClient` | Unauthenticated DRF client |
| `user1` | `User` | Authenticated user, author of `feature1` |
| `user2` | `User` | Authenticated user, author of `feature2` |
| `auth_client1` | `APIClient` | Client with JWT token for `user1` |
| `auth_client2` | `APIClient` | Client with JWT token for `user2` |
| `feature1` | `Feature` | Created by `user1`, status `open` |
| `feature2` | `Feature` | Created by `user2`, status `planned` |

---

## Expected Output

```
============================= test session starts ==============================
platform darwin -- Python 3.10.x, pytest-9.x.x, pluggy-1.x.x
django: version: 5.2.4, settings: core.settings (from ini)
rootdir: /path/to/backend
configfile: pytest.ini
plugins: django-4.x.x
collected 30 items

tests/test_auth.py::TestRegister::test_register_success PASSED
tests/test_auth.py::TestRegister::test_register_duplicate_username PASSED
tests/test_auth.py::TestRegister::test_register_missing_fields PASSED
tests/test_auth.py::TestMe::test_me_authenticated PASSED
tests/test_auth.py::TestMe::test_me_unauthenticated PASSED
tests/test_auth.py::TestLogout::test_logout_returns_200 PASSED
tests/test_auth.py::TestLogout::test_logout_unauthenticated_still_returns_200 PASSED
tests/test_features.py::TestListFeatures::test_list_returns_200_unauthenticated PASSED
tests/test_features.py::TestListFeatures::test_list_ordered_by_vote_count_descending PASSED
tests/test_features.py::TestListFeatures::test_list_includes_vote_count PASSED
tests/test_features.py::TestListFeatures::test_user_has_voted_true PASSED
tests/test_features.py::TestListFeatures::test_user_has_voted_false_for_unauthenticated PASSED
tests/test_features.py::TestListFeatures::test_user_has_voted_false_when_not_voted PASSED
tests/test_features.py::TestRetrieveFeature::test_retrieve_returns_200 PASSED
tests/test_features.py::TestRetrieveFeature::test_retrieve_not_found PASSED
tests/test_features.py::TestRetrieveFeature::test_retrieve_includes_author PASSED
tests/test_features.py::TestCreateFeature::test_create_authenticated PASSED
tests/test_features.py::TestCreateFeature::test_create_unauthenticated PASSED
tests/test_features.py::TestCreateFeature::test_create_sets_author_from_token PASSED
tests/test_features.py::TestCreateFeature::test_create_missing_title PASSED
tests/test_votes.py::TestVote::test_vote_success PASSED
tests/test_votes.py::TestVote::test_vote_increments_vote_count PASSED
tests/test_votes.py::TestVote::test_vote_own_feature_returns_400 PASSED
tests/test_votes.py::TestVote::test_vote_twice_returns_400 PASSED
tests/test_votes.py::TestVote::test_vote_unauthenticated_returns_401 PASSED
tests/test_votes.py::TestVote::test_vote_nonexistent_feature_returns_404 PASSED
tests/test_votes.py::TestUnvote::test_unvote_success PASSED
tests/test_votes.py::TestUnvote::test_unvote_not_found_returns_404 PASSED
tests/test_votes.py::TestUnvote::test_unvote_unauthenticated_returns_401 PASSED
tests/test_votes.py::TestUnvote::test_unvote_does_not_delete_other_users_vote PASSED

============================== 30 passed in 3.87s ==============================
```
