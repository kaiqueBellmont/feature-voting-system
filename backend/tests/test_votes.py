import pytest

from features.models import Vote


def vote_url(pk):
    return f'/api/features/{pk}/vote/'


@pytest.mark.django_db
class TestVote:
    def test_vote_success(self, auth_client2, user2, feature1):
        response = auth_client2.post(vote_url(feature1.pk))

        assert response.status_code == 201
        assert Vote.objects.filter(feature=feature1, user=user2).exists()

    def test_vote_increments_vote_count(self, auth_client2, user2, feature1):
        auth_client2.post(vote_url(feature1.pk))

        assert feature1.votes.count() == 1

    def test_vote_own_feature_returns_400(self, auth_client1, feature1):
        # user1 is the author of feature1
        response = auth_client1.post(vote_url(feature1.pk))

        assert response.status_code == 400
        assert 'cannot vote on your own feature' in response.data['detail']

    def test_vote_twice_returns_400(self, auth_client2, user2, feature1):
        auth_client2.post(vote_url(feature1.pk))
        response = auth_client2.post(vote_url(feature1.pk))

        assert response.status_code == 400
        assert 'Already voted' in response.data['detail']

    def test_vote_unauthenticated_returns_401(self, api_client, feature1):
        response = api_client.post(vote_url(feature1.pk))

        assert response.status_code == 401

    def test_vote_nonexistent_feature_returns_404(self, auth_client1):
        response = auth_client1.post(vote_url(999))

        assert response.status_code == 404


@pytest.mark.django_db
class TestUnvote:
    def test_unvote_success(self, auth_client2, user2, feature1):
        Vote.objects.create(feature=feature1, user=user2)

        response = auth_client2.delete(vote_url(feature1.pk))

        assert response.status_code == 204
        assert not Vote.objects.filter(feature=feature1, user=user2).exists()

    def test_unvote_not_found_returns_404(self, auth_client2, feature1):
        response = auth_client2.delete(vote_url(feature1.pk))

        assert response.status_code == 404

    def test_unvote_unauthenticated_returns_401(self, api_client, feature1):
        response = api_client.delete(vote_url(feature1.pk))

        assert response.status_code == 401

    def test_unvote_does_not_delete_other_users_vote(self, auth_client1, user1, user2, feature1):
        # user2 voted, user1 tries to unvote — should get 404, not delete user2's vote
        Vote.objects.create(feature=feature1, user=user2)

        response = auth_client1.delete(vote_url(feature1.pk))

        assert response.status_code == 404
        assert Vote.objects.filter(feature=feature1, user=user2).exists()
