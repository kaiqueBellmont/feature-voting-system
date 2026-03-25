"""
Seeder: creates 4 users and 10 features.
Run from the backend/ directory:
    python seeders/seed.py
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from features.models import Feature, User


USERS = [
    {'username': 'alice',   'email': 'alice@example.com',   'password': '123456'},
    {'username': 'bob',     'email': 'bob@example.com',     'password': '123456'},
    {'username': 'carol',   'email': 'carol@example.com',   'password': '123456'},
    {'username': 'dave',    'email': 'dave@example.com',    'password': '123456'},
]

FEATURES = [
    {
        'author': 'alice',
        'title': 'Dark Mode Support',
        'description': 'Add a dark mode toggle so users can switch the UI theme to reduce eye strain in low-light environments.',
        'status': Feature.Status.OPEN,
    },
    {
        'author': 'alice',
        'title': 'Export Data as CSV',
        'description': 'Allow users to export their feature requests and vote history as a CSV file for offline analysis.',
        'status': Feature.Status.PLANNED,
    },
    {
        'author': 'alice',
        'title': 'Two-Factor Authentication',
        'description': 'Add 2FA support via authenticator apps (TOTP) to improve account security for all users.',
        'status': Feature.Status.OPEN,
    },
    {
        'author': 'bob',
        'title': 'Email Notifications',
        'description': 'Send email notifications when a feature changes status or receives a significant number of votes.',
        'status': Feature.Status.OPEN,
    },
    {
        'author': 'bob',
        'title': 'Mobile App',
        'description': 'Build a native mobile app for iOS and Android so users can submit and vote on features on the go.',
        'status': Feature.Status.IN_PROGRESS,
    },
    {
        'author': 'bob',
        'title': 'Public API',
        'description': 'Expose a public REST API so third-party tools can read feature requests and vote counts programmatically.',
        'status': Feature.Status.PLANNED,
    },
    {
        'author': 'carol',
        'title': 'Custom Status Labels',
        'description': 'Let admins define their own status labels instead of being limited to the built-in set.',
        'status': Feature.Status.OPEN,
    },
    {
        'author': 'carol',
        'title': 'Comment Threads',
        'description': 'Allow users to leave comments on feature requests to discuss implementation details or use cases.',
        'status': Feature.Status.OPEN,
    },
    {
        'author': 'dave',
        'title': 'Feature Categories',
        'description': 'Organise feature requests into user-defined categories so they are easier to browse and filter.',
        'status': Feature.Status.PLANNED,
    },
    {
        'author': 'dave',
        'title': 'Changelog Page',
        'description': 'Automatically generate a changelog page from features that have been marked as completed.',
        'status': Feature.Status.OPEN,
    },
]


def run():
    created_users = {}

    for data in USERS:
        user, created = User.objects.get_or_create(
            username=data['username'],
            defaults={'email': data['email']},
        )
        if created:
            user.set_password(data['password'])
            user.save()
            print(f'  [+] User created: {user.username}')
        else:
            print(f'  [~] User already exists: {user.username}')
        created_users[user.username] = user

    for feature_data in FEATURES:
        author = created_users[feature_data['author']]
        feature, created = Feature.objects.get_or_create(
            title=feature_data['title'],
            author=author,
            defaults={
                'description': feature_data['description'],
                'status': feature_data['status'],
            },
        )
        if created:
            print(f'  [+] Feature created: "{feature.title}" by {author.username}')
        else:
            print(f'  [~] Feature already exists: "{feature.title}"')

    print('\nDone.')


if __name__ == '__main__':
    print('Running seeders...\n')
    run()
