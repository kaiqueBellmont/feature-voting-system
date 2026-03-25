from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    feature_title = serializers.CharField(source='feature.title', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display',
            'feature', 'feature_title',
            'message', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'type', 'feature', 'message', 'created_at']
