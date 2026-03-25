from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from features.models import Vote
from .models import Notification
from .serializers import NotificationSerializer


@receiver(post_save, sender=Vote)
def notify_on_vote(sender, instance, created, **kwargs):
    if not created:
        return

    vote = instance
    feature = vote.feature
    recipient = feature.author

    if vote.user == recipient:
        return

    notification = Notification.objects.create(
        recipient=recipient,
        type=Notification.Type.VOTE,
        feature=feature,
        message=f"{vote.user.username} voted on your feature '{feature.title}'",
    )

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{recipient.id}',
        {
            'type': 'send_notification',
            'data': NotificationSerializer(notification).data,
        },
    )
