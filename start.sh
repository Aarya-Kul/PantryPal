#!/usr/bin/env bash

# Exit on error
set -e

# Start Flask backend
echo "Starting Flask backend on port 8000..."
( cd backend && flask --app pantrypal --debug run --host 0.0.0.0 --port 8000 ) &

# Start Expo frontend
echo "Starting Expo frontend..."
( cd expo && npx expo start ) &

# Keep script alive to maintain background processes
wait
