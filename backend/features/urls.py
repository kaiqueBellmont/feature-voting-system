from rest_framework.routers import DefaultRouter

from .views import AuthViewSet, FeatureViewSet

router = DefaultRouter()
router.register('features', FeatureViewSet, basename='features')
router.register('auth', AuthViewSet, basename='auth')

urlpatterns = router.urls
