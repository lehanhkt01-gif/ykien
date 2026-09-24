#!/bin/bash
# ==============================================================
# SCRIPT TRIỂN KHAI HỆ THỐNG QUA DOCKER COMPOSE - XÃ EA SÚP
# ==============================================================

set -e

echo ">>> [1/5] Kiểm tra tệp môi trường .env..."
if [ ! -f .env ]; then
    echo "Tệp .env chưa tồn tại. Đang sao chép từ .env.example..."
    cp .env.example .env
    echo "Vui lòng kiểm tra và cập nhật các mật khẩu bảo mật trong .env!"
fi

echo ">>> [2/5] Dừng và dọn dẹp các container cũ (nếu có)..."
docker compose down --remove-orphans

echo ">>> [3/5] Khởi động Container Cơ sở dữ liệu PostgreSQL..."
docker compose up -d db

echo ">>> [4/5] Chờ Database sẵn sàng..."
until docker compose exec db pg_isready -U postgres; do
  echo "Đang đợi cơ sở dữ liệu khởi động..."
  sleep 2
done

echo ">>> [5/5] Xây dựng và khởi chạy toàn bộ dịch vụ (Web, Nginx, Dozzle)..."
docker compose up -d --build

echo "=============================================================="
echo " TRIỂN KHAI THÀNH CÔNG HỆ THỐNG TRẢ LỜI Ý KIẾN CỬ TRI XÃ EA SÚP"
echo " - Cổng thông tin Cử tri (Nginx Port 80): http://localhost"
echo " - Cổng Next.js trực tiếp (Port 3000):   http://localhost:3000"
echo " - Hệ thống Giám sát Dozzle (Port 8888):  http://localhost:8888"
echo "=============================================================="
