#!/bin/bash
set -e

cd /home/billias/ongit/inventory/server

echo "Killing existing server..."
pkill -f "node index.js" || true
sleep 1

echo "Removing old database..."
rm -f inventory.db

echo "Running import..."
/home/linuxbrew/.linuxbrew/Cellar/node@24/24.21.0_2/bin/node utils/importExcel.js

echo "Starting server..."
/home/linuxbrew/.linuxbrew/Cellar/node@24/24.21.0_2/bin/node index.js &
sleep 2

echo "Done!"
