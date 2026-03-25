from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Feature, User, Vote


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'is_staff', 'created_at']
    search_fields = ['username', 'email']


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'vote_count_display', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'description']
    list_editable = ['status']
    actions = ['mark_planned', 'mark_rejected']

    def vote_count_display(self, obj):
        return obj.votes.count()
    vote_count_display.short_description = 'Votes'

    @admin.action(description='Mark selected as Planned')
    def mark_planned(self, request, queryset):
        queryset.update(status=Feature.Status.PLANNED)

    @admin.action(description='Mark selected as Rejected')
    def mark_rejected(self, request, queryset):
        queryset.update(status=Feature.Status.REJECTED)


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['feature', 'user', 'created_at']
    search_fields = ['feature__title', 'user__username']
