import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from features.models import Feature, User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user1(db):
    return User.objects.create_user(
        username='user1',
        email='user1@example.com',
        password='123456',
    )


@pytest.fixture
def user2(db):
    return User.objects.create_user(
        username='user2',
        email='user2@example.com',
        password='123456',
    )


@pytest.fixture
def auth_client1(user1):
    client = APIClient()
    refresh = RefreshToken.for_user(user1)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def auth_client2(user2):
    client = APIClient()
    refresh = RefreshToken.for_user(user2)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def feature1(db, user1):
    return Feature.objects.create(
        title='Dark Mode Support',
        description='Add a dark mode toggle to the UI.',
        author=user1,
        status=Feature.Status.OPEN,
    )


@pytest.fixture
def feature2(db, user2):
    return Feature.objects.create(
        title='Export Data as CSV',
        description='Allow exporting feature requests as CSV.',
        author=user2,
        status=Feature.Status.PLANNED,
    )
