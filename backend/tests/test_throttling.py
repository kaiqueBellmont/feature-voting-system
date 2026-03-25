"""
Throttling tests — covers:
  - VoteRateThrottle: 429 after exceeding the vote limit
  - FeatureCreateRateThrottle: 429 after exceeding the feature create limit
  - Throttle is per-user (other users are not affected)
  - Actions not covered by custom throttles are unaffected
"""
import pytest
from django.core.cache import cache

from features.models import Feature


VOTE_URL   = lambda pk: f'/api/features/{pk}/vote/'
CREATE_URL = '/api/features/'


@pytest.fixture(autouse=True)
def clear_cache():
    """Reset throttle counters between tests."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def low_vote_limit(settings):
    """Override vote throttle to 3/hour so tests don't need 50 votes."""
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['vote'] = '3/hour'


@pytest.fixture
def low_create_limit(settings):
    """Override feature_create throttle to 2/day so tests don't need 10."""
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['feature_create'] = '2/day'


# ===========================================================================
# Vote throttle
# ===========================================================================

@pytest.mark.django_db
class TestVoteThrottle:
    def _make_features(self, count, author):
        return [
            Feature.objects.create(
                title=f'Feature {i}',
                description='desc',
                author=author,
            )
            for i in range(count)
        ]

    def test_vote_throttle_allows_requests_within_limit(
        self, auth_client1, user1, user2, low_vote_limit
    ):
        features = self._make_features(3, user2)

        for feature in features:
            response = auth_client1.post(VOTE_URL(feature.pk))
            assert response.status_code == 201

    def test_vote_throttle_returns_429_when_exceeded(
        self, auth_client1, user1, user2, low_vote_limit
    ):
        # limit = 3/hour; create 4 features so the 4th vote is throttled
        features = self._make_features(4, user2)

        for feature in features[:3]:
            auth_client1.post(VOTE_URL(feature.pk))

        response = auth_client1.post(VOTE_URL(features[3].pk))
        assert response.status_code == 429

    def test_vote_throttle_response_has_detail(
        self, auth_client1, user1, user2, low_vote_limit
    ):
        features = self._make_features(4, user2)
        for feature in features[:3]:
            auth_client1.post(VOTE_URL(feature.pk))

        response = auth_client1.post(VOTE_URL(features[3].pk))
        assert 'detail' in response.data

    def test_vote_throttle_is_per_user(
        self, auth_client1, auth_client2, user1, user2, low_vote_limit
    ):
        """user1 hitting the limit should not block user2."""
        features = self._make_features(4, user2)
        # exhaust user1's quota (user2 owns features, so user2 can't vote them)
        # use a third user's features instead
        from features.models import User
        user3 = User.objects.create_user(username='user3', password='123456')
        features3 = self._make_features(4, user3)

        for feature in features3[:3]:
            auth_client1.post(VOTE_URL(feature.pk))
        # user1 is now throttled
        assert auth_client1.post(VOTE_URL(features3[3].pk)).status_code == 429

        # user2 is unaffected
        feature_for_user2 = Feature.objects.create(
            title='For user2', description='desc', author=user3
        )
        assert auth_client2.post(VOTE_URL(feature_for_user2.pk)).status_code == 201


# ===========================================================================
# Feature create throttle
# ===========================================================================

@pytest.mark.django_db
class TestFeatureCreateThrottle:
    def _create(self, client, title='T'):
        return client.post(CREATE_URL, {'title': title, 'description': 'desc'})

    def test_create_throttle_allows_requests_within_limit(
        self, auth_client1, low_create_limit
    ):
        assert self._create(auth_client1, 'A').status_code == 201
        assert self._create(auth_client1, 'B').status_code == 201

    def test_create_throttle_returns_429_when_exceeded(
        self, auth_client1, low_create_limit
    ):
        self._create(auth_client1, 'A')
        self._create(auth_client1, 'B')

        response = self._create(auth_client1, 'C')
        assert response.status_code == 429

    def test_list_endpoint_is_not_throttled_by_create_limit(
        self, auth_client1, low_create_limit
    ):
        """Exhausting the create quota must not block read endpoints."""
        self._create(auth_client1, 'A')
        self._create(auth_client1, 'B')
        # quota exhausted
        assert self._create(auth_client1, 'C').status_code == 429

        # list should still work
        assert auth_client1.get(CREATE_URL).status_code == 200
