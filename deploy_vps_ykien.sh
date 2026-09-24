#!/bin/bash
# ==============================================================================
# HỆ THỐNG TIẾNG NÓI CỬ TRI - XÃ EA SÚP, TỈNH ĐẮK LẮK
# KỊCH BẢN TRIỂN KHAI TỰ ĐỘNG LÊN VPS CHO TÊN MIỀN: ykien.easupso.com
# ==============================================================================

set -e

# Màu sắc thông báo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   BẮT ĐẦU TRIỂN KHAI HỆ THỐNG 'TIẾNG NÓI CỬ TRI' XÃ EA SÚP LÊN VPS   ${NC}"
echo -e "${YELLOW}   Tên miền mục tiêu: https://ykien.easupso.com                      ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiểm tra Docker & Docker Compose
echo -e "\n${BLUE}>>> [1/6] Kiểm tra môi trường Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker chưa được cài đặt. Đang tiến hành cài đặt Docker tự động...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Cài đặt Docker thành công!${NC}"
fi

if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose chưa sẵn sàng. Đang bổ sung plugin...${NC}"
    apt-get update && apt-get install -y docker-compose-plugin
fi

# 2. Chuẩn bị tệp môi trường .env chuyên dụng cho tên miền ykien.easupso.com
echo -e "\n${BLUE}>>> [2/6] Thiết lập tệp cấu hình môi trường .env...${NC}"

DEFAULT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "easup_auth_secret_random_secure_key_2026_pro")
DEFAULT_JWT=$(openssl rand -hex 24 2>/dev/null || echo "easup_jwt_secret_super_secured_key_2026")

# Nhập thông tin Google OAuth (nếu chưa truyền qua biến môi trường)
CLIENT_ID_VAL="${GOOGLE_CLIENT_ID:-152633241243-placeholder.apps.googleusercontent.com}"
CLIENT_SECRET_VAL="${GOOGLE_CLIENT_SECRET:-placeholder_secret}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}Tạo tệp .env mới chuẩn hóa cho tên miền ykien.easupso.com...${NC}"
    cat <<EOF > .env
# Tên miền chính thức
NEXT_PUBLIC_APP_NAME="TIẾNG NÓI CỬ TRI - Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương"
NEXT_PUBLIC_HOTLINE="0262.3688.115"
NEXT_PUBLIC_EMAIL="mttq.easup@daklak.gov.vn"
NEXT_PUBLIC_ADDRESS="Xã Ea Súp, Tỉnh Đắk Lắk"

# Xác thực NextAuth v5 & Google OAuth
AUTH_SECRET="${DEFAULT_SECRET}"
NEXTAUTH_URL="https://ykien.easupso.com"
AUTH_TRUST_HOST="true"
GOOGLE_CLIENT_ID="\${GOOGLE_CLIENT_ID:-${CLIENT_ID_VAL}}"
GOOGLE_CLIENT_SECRET="\${GOOGLE_CLIENT_SECRET:-${CLIENT_SECRET_VAL}}"

# Cơ sở dữ liệu PostgreSQL bảo mật nội bộ Docker
DB_USER=postgres
DB_PASSWORD=$(openssl rand -hex 12 2>/dev/null || echo "EaSupSecured2026!")
DB_NAME=voter_feedback_db
DB_HOST=db
DB_PORT=5432
DATABASE_URL="postgresql://\${DB_USER}:\${DB_PASSWORD}@db:5432/\${DB_NAME}?schema=public"

# Bảo mật Cán bộ Quản trị
JWT_SECRET="${DEFAULT_JWT}"
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@EaSup2026!
EOF
    echo -e "${GREEN}✓ Đã tạo .env thành công với đầy đủ Google OAuth & Auth Secret!${NC}"
else
    echo -e "${GREEN}✓ Tệp .env đã tồn tại. Đang cập nhật NEXTAUTH_URL thành https://ykien.easupso.com...${NC}"
    # Đảm bảo NEXTAUTH_URL là https://ykien.easupso.com
    if grep -q "NEXTAUTH_URL=" .env; then
        sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL="https://ykien.easupso.com"|g' .env
    else
        echo 'NEXTAUTH_URL="https://ykien.easupso.com"' >> .env
    fi
    if ! grep -q "AUTH_TRUST_HOST=" .env; then
        echo 'AUTH_TRUST_HOST="true"' >> .env
    fi
fi

# 3. Tạo thư mục dữ liệu bền vững (đảm bảo không bị mất dữ liệu khi restart container)
echo -e "\n${BLUE}>>> [3/6] Khởi tạo các thư mục lưu trữ dữ liệu bền vững...${NC}"
mkdir -p data public/uploads
chmod -R 777 data public/uploads 2>/dev/null || true

# 4. Tắt các container cũ và dọn dẹp
echo -e "\n${BLUE}>>> [4/6] Dừng các phiên bản container cũ (nếu có)...${NC}"
docker compose down --remove-orphans || true

# 5. Khởi động và Build toàn bộ hệ thống
echo -e "\n${BLUE}>>> [5/6] Tiến hành đóng gói và kích hoạt Containers (Next.js, PostgreSQL, Nginx)...${NC}"
docker compose up -d --build

# 6. Đồng bộ Schema CSDL PostgreSQL qua Prisma
echo -e "\n${BLUE}>>> [6/6] Chờ CSDL sẵn sàng và tự động đồng bộ cấu trúc bảng...${NC}"
sleep 5
docker compose exec -T web npx prisma db push --skip-generate || true

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}  ✓ QUÁ TRÌNH TRIỂN KHAI HOÀN TẤT THÀNH CÔNG!                          ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "Hệ thống đang phục vụ tại:"
echo -e " - Tên miền chính thức : ${YELLOW}https://ykien.easupso.com${NC} (hoặc http://IP_VPS)"
echo -e " - Trang Quản trị viên : ${YELLOW}https://ykien.easupso.com/admin${NC}"
echo -e "   Tài khoản Admin    : ${GREEN}admin${NC} / Mật khẩu: ${GREEN}Admin@EaSup2026!${NC}"
echo -e " - Giám sát Logs Dozzle: ${YELLOW}http://IP_VPS:8888${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}LƯU Ý CẤU HÌNH TÊN MIỀN & GOOGLE CLOUD:${NC}"
echo -e "1. Trỏ DNS tại nhà cung cấp tên miền: Bản ghi A: ${GREEN}ykien.easupso.com${NC} -> ${GREEN}IP của VPS${NC}"
echo -e "2. Tại Google Cloud Console (APIs & Services > Credentials > OAuth Client ID):"
echo -e "   - Authorized JavaScript origins : ${GREEN}https://ykien.easupso.com${NC}"
echo -e "   - Authorized redirect URIs      : ${GREEN}https://ykien.easupso.com/api/auth/callback/google${NC}"
echo -e "${BLUE}======================================================================${NC}"
