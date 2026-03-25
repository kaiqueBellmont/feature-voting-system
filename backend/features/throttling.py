from rest_framework.throttling import UserRateThrottle


class VoteRateThrottle(UserRateThrottle):
    scope = 'vote'


class FeatureCreateRateThrottle(UserRateThrottle):
    scope = 'feature_create'
