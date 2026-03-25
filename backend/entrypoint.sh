#!/bin/sh

echo "Running migrations..."
python manage.py migrate

echo "Creating superuser..."
python manage.py shell -c "
from features.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@admin.com', 'admin123')
    print('[+] Superuser created: admin / admin123')
else:
    print('[~] Superuser already exists')
"

echo "Running seeders..."
python seeders/seed.py

echo "Starting server..."
daphne -b 0.0.0.0 -p 8000 core.asgi:application