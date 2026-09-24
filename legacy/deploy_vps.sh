#!/bin/bash
# ==============================================================================
# Script tự động triển khai website ykien.easupso.com trên VPS (Ubuntu/Debian)
# Dự án: Cổng tiếp nhận & Trả lời ý kiến cử tri xã Ea Súp
# ==============================================================================

set -e

DOMAIN="ykien.easupso.com"
WEB_DIR="/var/www/$DOMAIN"
REPO_URL="https://github.com/lehanhkt01-gif/ykien.git"
EMAIL="easupsohoa@gmail.com"

echo "================================================================="
echo "🚀 BẮT ĐẦU TRIỂN KHAI WEBSITE: https://$DOMAIN"
echo "================================================================="

echo "▶ 1. Cập nhật hệ thống & Cài đặt Nginx, Git, Certbot..."
sudo apt update -y
sudo apt install -y nginx git certbot python3-certbot-nginx

echo "▶ 2. Tải/Cập nhật mã nguồn từ GitHub về $WEB_DIR..."
if [ -d "$WEB_DIR/.git" ]; then
    echo "Thư mục mã nguồn đã tồn tại, đang pull phiên bản mới nhất..."
    cd "$WEB_DIR"
    sudo git pull origin main
else
    sudo mkdir -p "$WEB_DIR"
    sudo git clone "$REPO_URL" "$WEB_DIR"
fi

sudo chown -R www-data:www-data "$WEB_DIR"
sudo chmod -R 755 "$WEB_DIR"

echo "▶ 3. Tạo cấu hình Virtual Host Nginx cho $DOMAIN..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    root $WEB_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Bật nén Gzip tối ưu tốc độ
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;

    access_log /var/log/nginx/ykien_access.log;
    error_log /var/log/nginx/ykien_error.log;
}
EOF

# Kích hoạt site nếu chưa tạo symlink
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Kiểm tra cấu hình Nginx
echo "▶ Kiểm tra cấu hình Nginx..."
sudo nginx -t
sudo systemctl restart nginx

echo "▶ 4. Đăng ký chứng chỉ SSL HTTPS miễn phí (Certbot Let's Encrypt)..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect || {
    echo "⚠️ Certbot chưa thể cấp SSL ngay lúc này (có thể do DNS chưa đồng bộ toàn cầu)."
    echo "Bạn có thể chạy lại lệnh sau khi DNS đã trỏ xong: sudo certbot --nginx -d $DOMAIN"
}

echo "================================================================="
echo "🎉 TRIỂN KHAI THÀNH CÔNG!"
echo "👉 Truy cập website: https://$DOMAIN"
echo "================================================================="
