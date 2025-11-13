#!/bin/bash
# Start script for Render deployment

# Wait for database to be ready
echo "Waiting for database..."
sleep 2

# Run database migrations if needed
# Uncomment the next line if you want to run migrations on startup
# python -m flask db upgrade

# Start the application
echo "Starting application..."
python app.py

