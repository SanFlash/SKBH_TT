#!/bin/bash
# This script runs before the app starts on Render

echo "Starting Table Tennis Tournament Manager..."

# Create database tables
echo "Initializing database..."
python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"

echo "Starting application..."
exec "$@"