#!/bin/bash
# ==============================================================
# SCRIPT TRIỂN KHAI HỆ THỐNG QUA DOCKER COMPOSE - XÃ EA SÚP
# ==============================================================

set -e

echo ">>> [1/5] Kiểm tra tệp môi trường .env..."
if [ ! -f .env ]; then
    echo "Tệp .env chưa tồn tại. Đang sao chép từ .env.example..."
    cp .env.example .env
fi

# Tạo các thư mục dữ liệu bền vững
mkdir -p data public/uploads
chmod -R 777 data public/uploads 2>/dev/null || true

echo ">>> [2/5] Dừng và dọn dẹp các container cũ (nếu có)..."
docker compose down --remove-orphans || true

echo ">>> [3/5] Khởi động Container Cơ sở dữ liệu PostgreSQL..."
docker compose up -d db

echo ">>> [4/5] Chờ Database sẵn sàng..."
until docker compose exec db pg_isready -U postgres; do
  echo "Đang đợi cơ sở dữ liệu khởi động..."
  sleep 2
done

echo ">>> [5/5] Xây dựng và khởi chạy toàn bộ dịch vụ (Web, Nginx, Dozzle)..."
docker compose up -d --build

echo ">>> Đồng bộ Schema Prisma DB..."
docker compose exec -T web npx prisma db push --skip-generate || true

echo "=============================================================="
echo " TRIỂN KHAI THÀNH CÔNG HỆ THỐNG TIẾNG NÓI CỬ TRI XÃ EA SÚP"
echo " - Tên miền: https://ykien.easupso.com (hoặc http://IP_VPS)"
echo " - Quản trị: https://ykien.easupso.com/admin"
echo "=============================================================="
