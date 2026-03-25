import pytest


REGISTER_URL = '/api/auth/register/'
LOGOUT_URL = '/api/auth/logout/'
ME_URL = '/api/auth/me/'


@pytest.mark.django_db
class TestRegister:
    def test_register_success(self, api_client):
        payload = {'username': 'newuser', 'email': 'new@example.com', 'password': 'secret123'}
        response = api_client.post(REGISTER_URL, payload)

        assert response.status_code == 201
        assert response.data['user']['username'] == 'newuser'
        assert response.data['user']['email'] == 'new@example.com'
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'password' not in response.data['user']

    def test_register_duplicate_username(self, api_client, user1):
        payload = {'username': 'user1', 'email': 'other@example.com', 'password': 'secret123'}
        response = api_client.post(REGISTER_URL, payload)

        assert response.status_code == 400

    def test_register_missing_fields(self, api_client):
        response = api_client.post(REGISTER_URL, {'username': 'incomplete'})

        assert response.status_code == 400


@pytest.mark.django_db
class TestMe:
    def test_me_authenticated(self, auth_client1, user1):
        response = auth_client1.get(ME_URL)

        assert response.status_code == 200
        assert response.data['username'] == user1.username
        assert response.data['email'] == user1.email
        assert 'password' not in response.data

    def test_me_unauthenticated(self, api_client):
        response = api_client.get(ME_URL)

        assert response.status_code == 401


@pytest.mark.django_db
class TestLogout:
    def test_logout_returns_200(self, auth_client1):
        response = auth_client1.post(LOGOUT_URL)

        assert response.status_code == 200

    def test_logout_unauthenticated_still_returns_200(self, api_client):
        # JWT logout is stateless — no session to validate
        response = api_client.post(LOGOUT_URL)

        assert response.status_code == 200
