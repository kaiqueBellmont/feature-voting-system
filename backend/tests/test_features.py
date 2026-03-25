import pytest

from features.models import Feature, Vote


LIST_URL = '/api/features/'


def detail_url(pk):
    return f'/api/features/{pk}/'


@pytest.mark.django_db
class TestListFeatures:
    def test_list_returns_200_unauthenticated(self, api_client, feature1, feature2):
        response = api_client.get(LIST_URL)

        assert response.status_code == 200
        assert len(response.data) == 2

    def test_list_ordered_by_vote_count_descending(self, api_client, user1, user2, feature1, feature2):
        # feature2 gets 1 vote, feature1 gets 0 — feature2 should come first
        Vote.objects.create(feature=feature2, user=user1)

        response = api_client.get(LIST_URL)

        assert response.status_code == 200
        assert response.data[0]['id'] == feature2.id
        assert response.data[1]['id'] == feature1.id

    def test_list_includes_vote_count(self, api_client, user1, user2, feature1, feature2):
        Vote.objects.create(feature=feature1, user=user2)

        response = api_client.get(LIST_URL)

        feature1_data = next(f for f in response.data if f['id'] == feature1.id)
        assert feature1_data['vote_count'] == 1

    def test_user_has_voted_true(self, auth_client2, user2, feature1):
        Vote.objects.create(feature=feature1, user=user2)

        response = auth_client2.get(LIST_URL)

        feature1_data = next(f for f in response.data if f['id'] == feature1.id)
        assert feature1_data['user_has_voted'] is True

    def test_user_has_voted_false_for_unauthenticated(self, api_client, feature1):
        response = api_client.get(LIST_URL)

        feature1_data = next(f for f in response.data if f['id'] == feature1.id)
        assert feature1_data['user_has_voted'] is False

    def test_user_has_voted_false_when_not_voted(self, auth_client1, feature2):
        response = auth_client1.get(LIST_URL)

        feature2_data = next(f for f in response.data if f['id'] == feature2.id)
        assert feature2_data['user_has_voted'] is False


@pytest.mark.django_db
class TestRetrieveFeature:
    def test_retrieve_returns_200(self, api_client, feature1):
        response = api_client.get(detail_url(feature1.pk))

        assert response.status_code == 200
        assert response.data['id'] == feature1.id
        assert response.data['title'] == feature1.title

    def test_retrieve_not_found(self, api_client):
        response = api_client.get(detail_url(999))

        assert response.status_code == 404

    def test_retrieve_includes_author(self, api_client, feature1, user1):
        response = api_client.get(detail_url(feature1.pk))

        assert response.data['author']['username'] == user1.username


@pytest.mark.django_db
class TestCreateFeature:
    def test_create_authenticated(self, auth_client1, user1):
        payload = {'title': 'New Feature', 'description': 'A great idea.'}
        response = auth_client1.post(LIST_URL, payload)

        assert response.status_code == 201
        assert response.data['title'] == 'New Feature'
        assert response.data['author']['username'] == user1.username
        assert response.data['status'] == Feature.Status.OPEN

    def test_create_unauthenticated(self, api_client):
        payload = {'title': 'New Feature', 'description': 'A great idea.'}
        response = api_client.post(LIST_URL, payload)

        assert response.status_code == 401

    def test_create_sets_author_from_token(self, auth_client1, user1):
        # author cannot be set via request body — always derived from the JWT
        payload = {'title': 'Injected', 'description': 'Attempt to set author.', 'author': 999}
        response = auth_client1.post(LIST_URL, payload)

        assert response.status_code == 201
        assert response.data['author']['id'] == user1.id

    def test_create_missing_title(self, auth_client1):
        response = auth_client1.post(LIST_URL, {'description': 'No title.'})

        assert response.status_code == 400
