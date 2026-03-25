import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token = self.scope['query_string'].decode()
        token = dict(
            param.split('=') for param in token.split('&') if '=' in param
        ).get('token')

        user = await self._get_user(token)
        if user is None:
            await self.close()
            return

        self.user = user
        self.group_name = f'user_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Server → client only; incoming messages are ignored
        pass

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event['data']))

    # --- helpers ---

    @database_sync_to_async
    def _get_user(self, token):
        if not token:
            return None
        try:
            payload = AccessToken(token)
            return User.objects.get(id=payload['user_id'])
        except Exception:
            return None


async def send_notification_to_user(channel_layer, user_id, data):
    """Helper to push a notification to a user's group from outside the consumer."""
    await channel_layer.group_send(
        f'user_{user_id}',
        {'type': 'send_notification', 'data': data},
    )
