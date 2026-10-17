#!/bin/bash

echo "🚀 Installing dependencies..."
rm -rf node_modules package-lock.json
npm install

echo ""
echo "🗄️ Running database migrations..."
npm run migrate

echo ""
echo "📊 Importing Excel data..."
npm run import-excel

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "  npm run dev"
