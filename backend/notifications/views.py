from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema_view(
    list=extend_schema(
        tags=['notifications'],
        summary='List notifications',
        description=(
            'Returns the authenticated user\'s notifications, newest first. '
            'Includes the `X-Unread-Count` response header with the total number of unread notifications. '
            'Use `?unread=true` to return only unread items.'
        ),
        parameters=[
            OpenApiParameter('unread', bool, description='When `true`, returns only unread notifications'),
            OpenApiParameter('page', int, description='Page number'),
        ],
    ),
    partial_update=extend_schema(
        tags=['notifications'],
        summary='Mark a notification as read or unread',
        description='Updates the `is_read` field of a notification. Only the recipient can update their own notifications.',
        responses={
            200: NotificationSerializer,
            404: OpenApiResponse(description='Notification not found or belongs to another user'),
        },
    ),
)
class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination
    http_method_names = ['get', 'patch', 'post', 'head', 'options']
    lookup_value_regex = r'[0-9]+'

    def get_queryset(self):
        qs = (
            Notification.objects
            .filter(recipient=self.request.user)
            .select_related('feature', 'feature__author')
            .order_by('-created_at')
        )
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        unread_count = (
            Notification.objects
            .filter(recipient=request.user, is_read=False)
            .count()
        )
        response['X-Unread-Count'] = unread_count
        return response

    def partial_update(self, request, *args, **kwargs):
        notification = self.get_object()
        serializer = self.get_serializer(
            notification,
            data={'is_read': request.data.get('is_read')},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        tags=['notifications'],
        summary='Unread notification count',
        description='Returns the number of unread notifications for the authenticated user.',
        responses={200: OpenApiResponse(description='`{ "count": <int> }`')},
    )
    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        count = (
            Notification.objects
            .filter(recipient=request.user, is_read=False)
            .count()
        )
        return Response({'count': count})

    @extend_schema(
        tags=['notifications'],
        summary='Mark all notifications as read',
        description='Sets `is_read = true` on every unread notification belonging to the authenticated user.',
        responses={200: OpenApiResponse(description='All notifications marked as read')},
    )
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response(status=200)
