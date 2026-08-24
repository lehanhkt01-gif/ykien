# HƯỚNG DẪN TRIỂN KHAI WEBSITE LÊN VPS VÀ GẮN TÊN MIỀN
**Tên miền:** `ykien.easupso.com`  
**Dự án:** Cổng tiếp nhận & Trả lời ý kiến cử tri xã Ea Súp

---

## BƯỚC 1: TRỎ BẢN GHI DNS VỀ IP CỦA VPS

1. Đăng nhập vào trang quản lý tên miền **easupso.com** (tại Cloudflare, iNET, PA Việt Nam, Mắt Bão, v.v.).
2. Vào phần **Quản lý bản ghi DNS (DNS Management)** và thêm 1 bản ghi mới:
   - **Loại (Type):** `A`
   - **Tên (Name / Host):** `ykien`
   - **Giá trị (Value / IPv4 Address):** `<Địa_chỉ_IP_VPS_của_bạn>` *(Ví dụ: `103.xxx.xxx.xxx`)*
   - **TTL:** `Tự động (Auto)` hoặc `300`
3. Đợi 1-3 phút để tên miền nhận diện IP của VPS.

---

## BƯỚC 2: CÀI ĐẶT NGINX VÀ TẢI MÃ NGUỒN LÊN VPS (UBUNTU / DEBIAN)

Mở phần mềm kết nối SSH (như PuTTY, Termius, MobaXterm hoặc Terminal) đăng nhập vào VPS và chạy các lệnh sau:

### 1. Cài đặt Web Server Nginx & Công cụ SSL:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git certbot python3-certbot-nginx
```

### 2. Tải toàn bộ mã nguồn từ GitHub về VPS:
```bash
# Tạo thư mục chứa web
sudo mkdir -p /var/www/ykien.easupso.com

# Tải mã nguồn mới nhất từ GitHub
sudo git clone https://github.com/lehanhkt01-gif/ykien.git /var/www/ykien.easupso.com

# Phân quyền thư mục cho Nginx
sudo chown -R www-data:www-data /var/www/ykien.easupso.com
sudo chmod -R 755 /var/www/ykien.easupso.com
```

---

## BƯỚC 3: TẠO CẤU HÌNH VIRTUAL HOST TRÊN NGINX

1. Mở trình tạo file cấu hình cho tên miền:
```bash
sudo nano /etc/nginx/sites-available/ykien.easupso.com
```

2. Dán toàn bộ nội dung cấu hình dưới đây vào:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ykien.easupso.com;

    root /var/www/ykien.easupso.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Bật nén Gzip tăng tốc độ tải trang
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;

    # Ghi log truy cập
    access_log /var/log/nginx/ykien_access.log;
    error_log /var/log/nginx/ykien_error.log;
}
```
*(Bấm `Ctrl + O` rồi `Enter` để lưu, bấm `Ctrl + X` để thoát).*

3. Kích hoạt cấu hình và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ykien.easupso.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## BƯỚC 4: CÀI ĐẶT CHỨNG CHỈ BẢO MẬT SSL MIỄN PHÍ (HTTPS)

Chạy lệnh Certbot để tạo chứng chỉ SSL ổ khóa xanh tự động:
```bash
sudo certbot --nginx -d ykien.easupso.com
```
- Khi hệ thống hỏi email: Nhập `easupsohoa@gmail.com`
- Bấm `Y` đồng ý điều khoản.
- Certbot sẽ tự động cấu hình HTTPS và tự động gia hạn khi hết hạn.

---

## BƯỚC 5: CẬP NHẬT MÃ NGUỒN KHI CÓ THAY ĐỔI SAU NÀY

Mỗi khi bạn muốn cập nhật code mới nhất từ GitHub lên VPS, chỉ cần gõ 2 lệnh:
```bash
cd /var/www/ykien.easupso.com
sudo git pull origin main
```
Trang web sẽ tự động cập nhật ngay lập tức mà không cần khởi động lại máy chủ!
