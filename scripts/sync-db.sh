#!/bin/bash
# Pull production DB locally for development
# Usage: bash scripts/sync-db.sh

set -e

REMOTE="foodcentral@192.168.178.20"
REMOTE_DB="/data/food-central/food-central.db"
LOCAL_DB="./dev.db"

echo "Pulling production DB..."
scp "$REMOTE:$REMOTE_DB" "$LOCAL_DB"
echo "Done — dev.db is now a copy of production."
echo "Run 'npm run dev' to start with real data."
