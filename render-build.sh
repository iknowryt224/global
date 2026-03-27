#!/bin/bash
set -e

echo "🔍 Render Build Script for Global Access Shipping"
echo "=================================================="

echo ""
echo "📦 Step 1: Installing ALL dependencies (including devDependencies)..."
cd frontend
npm ci

echo ""
echo "🔨 Step 2: Building production bundle..."
npm run build

echo ""
echo "✅ Build complete!"
echo "📁 Output location: frontend/build"
echo "🚀 Ready for deployment!"
