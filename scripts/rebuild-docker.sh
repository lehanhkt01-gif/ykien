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

echo "=== [3/5] Phân quyền ghi toàn diện cho thư mục data và uploads ==="
mkdir -p data public/uploads
chmod -R 777 data public/uploads 2>/dev/null || true

echo "=== [4/5] Rebuild Docker image & khởi động CSDL PostgreSQL ==="
(docker compose down || docker-compose down) 2>/dev/null || true
(docker compose build --no-cache || docker-compose build --no-cache)
(docker compose up -d || docker-compose up -d)

echo ""
echo "=== [5/5] Kiểm tra trạng thái containers ==="
(docker compose ps || docker-compose ps)

echo ""
echo "✅ Hoàn tất! CSDL PostgreSQL và Web App đã sẵn sàng tự động đồng bộ!"
echo "   Kiểm tra tại: https://ykien.easupso.com/admin"
