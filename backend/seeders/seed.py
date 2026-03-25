"""
Seeder: creates 2 users and 2 features per user.
Run from the backend/ directory:
    python seeders/seed.py
"""

import os
import sys



# aponta para backend/ (pai da pasta seeders/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from features.models import Feature, User


USERS = [
    {
        'username': 'user1',
        'email': 'user1@example.com',
        'password': '123456',
    },
    {
        'username': 'user2',
        'email': 'user2@example.com',
        'password': '123456',
    },
]


def run():
    FEATURES = {
        'user1': [
            {
                'title': 'Dark Mode Support',
                'description': 'Add a dark mode toggle so users can switch the UI theme to reduce eye strain in low-light environments.',
                'status': Feature.Status.OPEN,
            },
            {
                'title': 'Export Data as CSV',
                'description': 'Allow users to export their feature requests and vote history as a CSV file for offline analysis.',
                'status': Feature.Status.PLANNED,
            },
        ],
        'user2': [
            {
                'title': 'Email Notifications',
                'description': 'Send email notifications to users when a feature they voted for changes status.',
                'status': Feature.Status.OPEN,
            },
            {
                'title': 'Mobile App',
                'description': 'Build a native mobile app for iOS and Android so users can submit and vote on features on the go.',
                'status': Feature.Status.IN_PROGRESS,
            },
        ],
    }

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

    for username, features in FEATURES.items():
        author = created_users[username]
        for feature_data in features:
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
