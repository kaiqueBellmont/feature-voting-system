from rest_framework import serializers

from .models import Feature, User, Vote


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class FeatureSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    user_has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Feature
        fields = [
            'id', 'title', 'description', 'author',
            'status', 'vote_count', 'user_has_voted',
            'created_at', 'updated_at'
        ]

    def get_user_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['id', 'feature', 'user', 'created_at']
        read_only_fields = ['user']
