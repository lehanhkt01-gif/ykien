#!/bin/bash
# ==============================================
# SCRIPT REBUILD DOCKER CHO VPS
# Chạy: bash /var/www/ykien.easupso.com/scripts/rebuild-docker.sh
# ==============================================

APP_DIR="/var/www/ykien.easupso.com"

echo "=== [1/4] Vào thư mục app ==="
cd "$APP_DIR"

echo "=== [2/4] Git pull code mới ==="
git pull origin main

echo "=== [3/4] Rebuild Docker image (có thể mất 3-5 phút) ==="
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "=== [4/4] Kiểm tra container đang chạy ==="
docker-compose ps

echo ""
echo "✅ Hoàn tất! Kiểm tra tại https://ykien.easupso.com"
echo "   (Chờ khoảng 30 giây để container khởi động hoàn toàn)"
