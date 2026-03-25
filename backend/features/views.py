from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Feature, Vote
from .serializers import FeatureSerializer, RegisterSerializer, UserSerializer


class FeatureViewSet(viewsets.ModelViewSet):
    serializer_class = FeatureSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return (
            Feature.objects
            .select_related('author')
            .prefetch_related('votes')
            .annotate(vote_count=Count('votes'))
            .order_by('-vote_count')
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        feature = self.get_object()
        if feature.author == request.user:
            return Response({'detail': 'You cannot vote on your own feature.'}, status=status.HTTP_400_BAD_REQUEST)
        _, created = Vote.objects.get_or_create(feature=feature, user=request.user)
        if not created:
            return Response({'detail': 'Already voted.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_201_CREATED)

    @vote.mapping.delete
    def unvote(self, request, pk=None):
        feature = self.get_object()
        deleted, _ = Vote.objects.filter(feature=feature, user=request.user).delete()
        if not deleted:
            return Response({'detail': 'Vote not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AuthViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # gera tokens JWT automaticamente após registro
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        # com JWT o logout é stateless — frontend deleta o token
        # opcionalmente blacklista o refresh token
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data)
