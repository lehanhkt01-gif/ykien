#!/bin/bash
# Script deploy cập nhật code lên VPS
# Chạy trên VPS: bash deploy-vps.sh

set -e
APP_DIR="/var/www/ykien.easupso.com"
APP_NAME="ykien"

echo "=== [1/5] Vào thư mục app ==="
cd "$APP_DIR"

echo "=== [2/5] Git pull code mới từ GitHub ==="
git pull origin main

echo "=== [3/5] Cài dependencies ==="
npm install --legacy-peer-deps

echo "=== [4/5] Build production ==="
npm run build

echo "=== [5/5] Restart PM2 ==="
pm2 restart "$APP_NAME" || pm2 start npm --name "$APP_NAME" -- start

echo ""
echo "✅ Deploy hoàn tất! Kiểm tra tại https://ykien.easupso.com"
pm2 status
