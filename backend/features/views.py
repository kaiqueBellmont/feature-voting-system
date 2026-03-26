from django.db.models import Count, F, Window
from django.db.models.functions import Rank
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Feature, Vote
from .serializers import FeatureSerializer, RegisterSerializer, UserSerializer
from .throttling import FeatureCreateRateThrottle, VoteRateThrottle


class FeaturePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema_view(
    list=extend_schema(
        tags=['features'],
        summary='List feature requests',
        description=(
            'Returns a paginated list of all feature requests ordered by vote count (highest first). '
            'Supports full-text search on title and description, ordering and pagination. '
            'Public endpoint — no authentication required.'
        ),
        parameters=[
            OpenApiParameter('search', str, description='Search in title and description'),
            OpenApiParameter('ordering', str, description='Sort by: `vote_count`, `-vote_count`, `created_at`, `-created_at`'),
            OpenApiParameter('page', int, description='Page number'),
            OpenApiParameter('page_size', int, description='Results per page (max 100)'),
        ],
    ),
    create=extend_schema(
        tags=['features'],
        summary='Create a feature request',
        description='Creates a new feature request. The authenticated user becomes the author. Max 10 per day.',
    ),
    retrieve=extend_schema(
        tags=['features'],
        summary='Retrieve a feature request',
        description='Returns a single feature request by ID, including vote count and rank.',
    ),
    update=extend_schema(
        tags=['features'],
        summary='Replace a feature request',
        description='Full update. Only the feature author can update.',
    ),
    partial_update=extend_schema(
        tags=['features'],
        summary='Partially update a feature request',
        description='Partial update. Only the feature author can update.',
    ),
    destroy=extend_schema(
        tags=['features'],
        summary='Delete a feature request',
        description='Deletes the feature request and all associated votes. Only the feature author can delete.',
    ),
)
class FeatureViewSet(viewsets.ModelViewSet):
    serializer_class = FeatureSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = FeaturePagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['vote_count', 'created_at']

    def get_queryset(self):
        return (
            Feature.objects
            .select_related('author')
            .prefetch_related('votes')
            .annotate(vote_count=Count('votes'))
            .annotate(rank=Window(
                expression=Rank(),
                order_by=F('vote_count').desc()
            ))
            .order_by('-vote_count')
        )

    def get_throttles(self):
        if self.action == 'vote':
            return [VoteRateThrottle()]
        if self.action == 'create':
            return [FeatureCreateRateThrottle()]
        return super().get_throttles()

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @extend_schema(
        tags=['features'],
        summary='Vote on a feature',
        description=(
            'Casts a vote for the feature. Authors cannot vote on their own features. '
            'Each user can vote once per feature. Rate limited to **50 votes/hour**.'
        ),
        responses={
            201: OpenApiResponse(description='Vote registered'),
            400: OpenApiResponse(description='Already voted or own feature'),
            429: OpenApiResponse(description='Vote rate limit exceeded'),
        },
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        feature = self.get_object()
        if feature.author == request.user:
            return Response({'detail': 'You cannot vote on your own feature.'}, status=status.HTTP_400_BAD_REQUEST)
        _, created = Vote.objects.get_or_create(feature=feature, user=request.user)
        if not created:
            return Response({'detail': 'Already voted.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=['features'],
        summary='Remove a vote from a feature',
        description='Removes a previously cast vote. Returns 404 if the user has not voted on this feature.',
        responses={
            204: OpenApiResponse(description='Vote removed'),
            404: OpenApiResponse(description='Vote not found'),
        },
    )
    @vote.mapping.delete
    def unvote(self, request, pk=None):
        feature = self.get_object()
        deleted, _ = Vote.objects.filter(feature=feature, user=request.user).delete()
        if not deleted:
            return Response({'detail': 'Vote not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AuthViewSet(viewsets.ViewSet):
    serializer_class = UserSerializer

    @extend_schema(
        tags=['auth'],
        summary='Register a new user',
        description='Creates a new user account and returns a JWT token pair immediately — no separate login needed.',
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(description='User created. Returns `user`, `access` and `refresh` tokens.'),
            400: OpenApiResponse(description='Validation error (e.g. username already taken)'),
        },
    )
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=['auth'],
        summary='Logout',
        description=(
            'Stateless logout — JWT is discarded on the client side. '
            'This endpoint exists as a hook for optional server-side token blacklisting.'
        ),
        responses={200: OpenApiResponse(description='Logged out')},
    )
    @action(detail=False, methods=['post'])
    def logout(self, request):
        return Response(status=status.HTTP_200_OK)

    @extend_schema(
        tags=['auth'],
        summary='Current user',
        description='Returns the profile of the currently authenticated user.',
        responses={
            200: UserSerializer,
            401: OpenApiResponse(description='Not authenticated'),
        },
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data)
