from django.conf import settings
from django.db import models

from features.models import Feature


class Notification(models.Model):
    class Type(models.TextChoices):
        VOTE    = 'vote',    'Someone voted on your feature'
        STATUS  = 'status',  'Feature status changed'
        COMMENT = 'comment', 'New comment on your feature'

    recipient  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=20, choices=Type.choices)
    feature    = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name='notifications')
    message    = models.CharField(max_length=255)
    is_read    = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f'{self.get_type_display()} → {self.recipient} ({self.feature_id})'
