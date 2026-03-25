"""
Notification tests — covers:
  - post_save signal on Vote (create notification, skip self-vote, correct fields, channel push)
  - NotificationViewSet: list, unread filter, X-Unread-Count header, unread_count action,
    mark_all_read action, partial_update (owner-only is_read)
"""
import pytest
from unittest.mock import MagicMock

from features.models import Vote
from notifications.models import Notification


NOTIFICATIONS_URL = '/api/notifications/'
UNREAD_COUNT_URL  = '/api/notifications/unread_count/'
MARK_ALL_READ_URL = '/api/notifications/mark_all_read/'


def notif_url(pk):
    return f'/api/notifications/{pk}/'


# ---------------------------------------------------------------------------
# File-local mock that also captures sent messages for assertion
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_channel_layer(monkeypatch):
    """Extend the global mock to also capture sent messages for assertion."""
    sent = []

    async def fake_group_send(group, message):
        sent.append((group, message))

    layer = MagicMock()
    layer.group_send = fake_group_send
    layer.sent = sent

    monkeypatch.setattr('notifications.signals.get_channel_layer', lambda: layer)
    return layer


# ===========================================================================
# Signal tests
# ===========================================================================

@pytest.mark.django_db
class TestVoteSignal:
    def test_vote_creates_notification(self, user2, feature1):
        Vote.objects.create(feature=feature1, user=user2)

        assert Notification.objects.filter(
            recipient=feature1.author,
            type=Notification.Type.VOTE,
            feature=feature1,
        ).exists()

    def test_self_vote_does_not_create_notification(self, user1, feature1):
        # user1 is the author of feature1 — voting on own feature must not notify
        Vote.objects.create(feature=feature1, user=user1)

        assert not Notification.objects.filter(recipient=user1).exists()

    def test_notification_has_correct_fields(self, user2, feature1):
        Vote.objects.create(feature=feature1, user=user2)

        notif = Notification.objects.get(recipient=feature1.author)
        assert notif.type == Notification.Type.VOTE
        assert notif.feature == feature1
        assert user2.username in notif.message
        assert feature1.title in notif.message

    def test_notification_recipient_is_feature_author(self, user1, user2, feature1):
        Vote.objects.create(feature=feature1, user=user2)

        notif = Notification.objects.get(feature=feature1)
        assert notif.recipient == user1

    def test_vote_update_does_not_create_extra_notification(self, user2, feature1):
        vote = Vote.objects.create(feature=feature1, user=user2)
        # Saving again simulates an update (created=False) — no extra notification
        vote.save()

        assert Notification.objects.filter(feature=feature1).count() == 1

    def test_channel_group_send_called_with_correct_group(self, mock_channel_layer, user2, feature1):
        from asgiref.sync import async_to_sync

        Vote.objects.create(feature=feature1, user=user2)

        # Allow the async fake_group_send to flush via asyncio
        import asyncio
        asyncio.get_event_loop().run_until_complete(asyncio.sleep(0))

        assert len(mock_channel_layer.sent) == 1
        group_name, message = mock_channel_layer.sent[0]
        assert group_name == f'user_{feature1.author.id}'
        assert message['type'] == 'send_notification'

    def test_multiple_votes_create_multiple_notifications(self, user1, user2, feature2):
        # feature2 is authored by user2; both user1 and a third user can vote
        from features.models import User
        user3 = User.objects.create_user(username='user3', password='123456')
        Vote.objects.create(feature=feature2, user=user1)
        Vote.objects.create(feature=feature2, user=user3)

        assert Notification.objects.filter(recipient=user2, feature=feature2).count() == 2


# ===========================================================================
# NotificationViewSet — list
# ===========================================================================

@pytest.mark.django_db
class TestNotificationList:
    def test_list_requires_authentication(self, api_client):
        response = api_client.get(NOTIFICATIONS_URL)

        assert response.status_code == 401

    def test_list_returns_only_own_notifications(
        self, auth_client1, notification_for_user1, notification_for_user2
    ):
        response = auth_client1.get(NOTIFICATIONS_URL)

        assert response.status_code == 200
        ids = [n['id'] for n in response.data['results']]
        assert notification_for_user1.id in ids
        assert notification_for_user2.id not in ids

    def test_list_has_pagination_envelope(self, auth_client1, notification_for_user1):
        response = auth_client1.get(NOTIFICATIONS_URL)

        assert 'count' in response.data
        assert 'results' in response.data
        assert 'next' in response.data

    def test_list_ordered_newest_first(self, auth_client1, user1, feature2):
        n1 = Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='first',
        )
        n2 = Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='second',
        )

        response = auth_client1.get(NOTIFICATIONS_URL)

        ids = [n['id'] for n in response.data['results']]
        assert ids.index(n2.id) < ids.index(n1.id)

    def test_list_unread_filter_returns_only_unread(
        self, auth_client1, user1, feature2
    ):
        unread = Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='unread', is_read=False,
        )
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='read', is_read=True,
        )

        response = auth_client1.get(NOTIFICATIONS_URL + '?unread=true')

        ids = [n['id'] for n in response.data['results']]
        assert ids == [unread.id]

    def test_list_x_unread_count_header_correct(self, auth_client1, user1, feature2):
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='a', is_read=False,
        )
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='b', is_read=False,
        )
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='c', is_read=True,
        )

        response = auth_client1.get(NOTIFICATIONS_URL)

        assert int(response['X-Unread-Count']) == 2

    def test_list_x_unread_count_zero_when_all_read(self, auth_client1, user1, feature2):
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='read', is_read=True,
        )

        response = auth_client1.get(NOTIFICATIONS_URL)

        assert int(response['X-Unread-Count']) == 0

    def test_list_includes_feature_title(self, auth_client1, notification_for_user1):
        response = auth_client1.get(NOTIFICATIONS_URL)

        result = response.data['results'][0]
        assert result['feature_title'] is not None


# ===========================================================================
# NotificationViewSet — unread_count action
# ===========================================================================

@pytest.mark.django_db
class TestUnreadCount:
    def test_unread_count_requires_authentication(self, api_client):
        response = api_client.get(UNREAD_COUNT_URL)

        assert response.status_code == 401

    def test_unread_count_returns_correct_value(self, auth_client1, user1, feature2):
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='x', is_read=False,
        )
        Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='y', is_read=True,
        )

        response = auth_client1.get(UNREAD_COUNT_URL)

        assert response.status_code == 200
        assert response.data['count'] == 1

    def test_unread_count_zero_when_none(self, auth_client1):
        response = auth_client1.get(UNREAD_COUNT_URL)

        assert response.data['count'] == 0

    def test_unread_count_does_not_include_other_users(
        self, auth_client1, notification_for_user2
    ):
        # notification_for_user2 is unread but belongs to user2, not user1
        response = auth_client1.get(UNREAD_COUNT_URL)

        assert response.data['count'] == 0


# ===========================================================================
# NotificationViewSet — mark_all_read action
# ===========================================================================

@pytest.mark.django_db
class TestMarkAllRead:
    def test_mark_all_read_requires_authentication(self, api_client):
        response = api_client.post(MARK_ALL_READ_URL)

        assert response.status_code == 401

    def test_mark_all_read_returns_200(self, auth_client1, notification_for_user1):
        response = auth_client1.post(MARK_ALL_READ_URL)

        assert response.status_code == 200

    def test_mark_all_read_marks_all_as_read(self, auth_client1, user1, feature2):
        for i in range(3):
            Notification.objects.create(
                recipient=user1, type=Notification.Type.VOTE,
                feature=feature2, message=f'msg {i}', is_read=False,
            )

        auth_client1.post(MARK_ALL_READ_URL)

        assert Notification.objects.filter(recipient=user1, is_read=False).count() == 0

    def test_mark_all_read_only_affects_own_notifications(
        self, auth_client1, user2, feature1, notification_for_user2
    ):
        # user2 has an unread notification; user1 calls mark_all_read
        auth_client1.post(MARK_ALL_READ_URL)

        notification_for_user2.refresh_from_db()
        assert notification_for_user2.is_read is False


# ===========================================================================
# NotificationViewSet — partial_update (PATCH /{id}/)
# ===========================================================================

@pytest.mark.django_db
class TestPartialUpdate:
    def test_patch_requires_authentication(self, api_client, notification_for_user1):
        response = api_client.patch(notif_url(notification_for_user1.pk), {'is_read': True})

        assert response.status_code == 401

    def test_owner_can_mark_as_read(self, auth_client1, notification_for_user1):
        response = auth_client1.patch(
            notif_url(notification_for_user1.pk), {'is_read': True}
        )

        assert response.status_code == 200
        notification_for_user1.refresh_from_db()
        assert notification_for_user1.is_read is True

    def test_owner_can_mark_as_unread(self, auth_client1, user1, feature2):
        notif = Notification.objects.create(
            recipient=user1, type=Notification.Type.VOTE,
            feature=feature2, message='x', is_read=True,
        )

        response = auth_client1.patch(notif_url(notif.pk), {'is_read': False})

        assert response.status_code == 200
        notif.refresh_from_db()
        assert notif.is_read is False

    def test_non_owner_gets_404(self, auth_client2, notification_for_user1):
        # notification_for_user1 belongs to user1; user2's queryset excludes it → 404
        response = auth_client2.patch(
            notif_url(notification_for_user1.pk), {'is_read': True}
        )

        assert response.status_code == 404

    def test_patch_does_not_change_message(self, auth_client1, notification_for_user1):
        original_message = notification_for_user1.message

        auth_client1.patch(
            notif_url(notification_for_user1.pk),
            {'is_read': True, 'message': 'injected'},
        )

        notification_for_user1.refresh_from_db()
        assert notification_for_user1.message == original_message

    def test_patch_nonexistent_returns_404(self, auth_client1):
        response = auth_client1.patch(notif_url(9999), {'is_read': True})

        assert response.status_code == 404
