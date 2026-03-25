"""
WebSocket consumer tests — covers:
  - unauthenticated / invalid token connections are rejected
  - valid token connections are accepted
  - user is added to the correct channel group
  - incoming client messages are silently ignored
  - messages pushed to the group are forwarded to the client
  - disconnect removes the user from the group
"""
import asyncio
import json
import pytest

from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from notifications.consumers import NotificationConsumer


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def in_memory_channel_layer(settings):
    """Use an in-memory channel layer for all consumer tests — no Redis needed."""
    settings.CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}
    }


def make_communicator(path='/ws/notifications/'):
    return WebsocketCommunicator(NotificationConsumer.as_asgi(), path)


def valid_token(user):
    return str(AccessToken.for_user(user))


# ---------------------------------------------------------------------------
# Connection — authentication
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_connect_without_token_is_rejected():
    async def _():
        comm = make_communicator()
        connected, _ = await comm.connect()
        assert not connected

    asyncio.run(_())


@pytest.mark.django_db(transaction=True)
def test_connect_with_invalid_token_is_rejected():
    async def _():
        comm = make_communicator('/ws/notifications/?token=this.is.garbage')
        connected, _ = await comm.connect()
        assert not connected

    asyncio.run(_())


@pytest.mark.django_db(transaction=True)
def test_connect_with_empty_token_is_rejected():
    async def _():
        comm = make_communicator('/ws/notifications/?token=')
        connected, _ = await comm.connect()
        assert not connected

    asyncio.run(_())


@pytest.mark.django_db(transaction=True)
def test_connect_with_valid_token_is_accepted(user1):
    token = valid_token(user1)

    async def _():
        comm = make_communicator(f'/ws/notifications/?token={token}')
        connected, _ = await comm.connect()
        assert connected
        await comm.disconnect()

    asyncio.run(_())


@pytest.mark.django_db(transaction=True)
def test_connect_with_nonexistent_user_token_is_rejected():
    from features.models import User
    from rest_framework_simplejwt.tokens import AccessToken

    # Build a token manually for a user id that doesn't exist
    token = AccessToken()
    token['user_id'] = 99999

    async def _():
        comm = make_communicator(f'/ws/notifications/?token={token}')
        connected, _ = await comm.connect()
        assert not connected

    asyncio.run(_())


# ---------------------------------------------------------------------------
# Receive — server → client only
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_incoming_client_message_is_ignored(user1):
    token = valid_token(user1)

    async def _():
        comm = make_communicator(f'/ws/notifications/?token={token}')
        await comm.connect()

        await comm.send_to(text_data=json.dumps({'msg': 'hello'}))

        # Consumer should not send anything back
        assert await comm.receive_nothing(timeout=0.1)
        await comm.disconnect()

    asyncio.run(_())


# ---------------------------------------------------------------------------
# Group push — channel layer → client
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_group_message_is_forwarded_to_client(user1):
    token = valid_token(user1)
    payload = {'id': 42, 'message': 'someone voted', 'is_read': False}

    async def _():
        comm = make_communicator(f'/ws/notifications/?token={token}')
        await comm.connect()

        layer = get_channel_layer()
        await layer.group_send(
            f'user_{user1.id}',
            {'type': 'send_notification', 'data': payload},
        )

        received = await comm.receive_json_from(timeout=1)
        assert received == payload
        await comm.disconnect()

    asyncio.run(_())


@pytest.mark.django_db(transaction=True)
def test_message_sent_to_other_user_group_is_not_received(user1, user2):
    token = valid_token(user1)

    async def _():
        comm = make_communicator(f'/ws/notifications/?token={token}')
        await comm.connect()

        layer = get_channel_layer()
        # Push to user2's group — user1's socket should not receive it
        await layer.group_send(
            f'user_{user2.id}',
            {'type': 'send_notification', 'data': {'id': 99}},
        )

        assert await comm.receive_nothing(timeout=0.1)
        await comm.disconnect()

    asyncio.run(_())


# ---------------------------------------------------------------------------
# Disconnect — group cleanup
# ---------------------------------------------------------------------------

@pytest.mark.django_db(transaction=True)
def test_disconnect_stops_receiving_group_messages(user1):
    token = valid_token(user1)

    async def _():
        comm = make_communicator(f'/ws/notifications/?token={token}')
        await comm.connect()
        await comm.disconnect()

        # After disconnect, pushing to the group should not raise and yields nothing
        layer = get_channel_layer()
        await layer.group_send(
            f'user_{user1.id}',
            {'type': 'send_notification', 'data': {'id': 1}},
        )
        assert await comm.receive_nothing(timeout=0.1)

    asyncio.run(_())
