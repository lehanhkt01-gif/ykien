# HƯỚNG DẪN KẾT NỐI CƠ SỞ DỮ LIỆU POSTGRESQL (SUPABASE / POSTGREST)
**CỔNG TIẾP NHẬN & XỬ LÝ Ý KIẾN CỬ TRI XÃ EA SÚP**

Hệ thống đã được tích hợp sẵn trình điều khiển **PostgreSQL Database** đám mây (thông qua nền tảng Supabase / PostgREST). Dưới đây là hướng dẫn 3 bước để khởi tạo và kết nối cơ sở dữ liệu PostgreSQL hoàn toàn miễn phí.

---

## BƯỚC 1: TẠO DỰ ÁN POSTGRESQL MIỄN PHÍ TRÊN SUPABASE

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập bằng tài khoản GitHub hoặc Google (`lehanhkt01@gmail.com`).
2. Bấm nút **"New Project"** (Dự án mới).
3. Điền thông tin dự án:
   - **Name**: `easup-citizen-feedbacks`
   - **Database Password**: Nhập mật khẩu quản trị CSDL của bạn.
   - **Region**: Chọn `Singapore (ap-southeast-1)` để có tốc độ truy cập nhanh nhất tại Việt Nam.
   - **Pricing Plan**: Chọn **Free Tier ($0/tháng)**.
4. Bấm **"Create new project"** và đợi khoảng 1 phút để hệ thống tạo máy chủ PostgreSQL.

---

## BƯỚC 2: CHẠY SCRIPT TẠO BẢNG CSDL (SCHEMA.SQL)

1. Trên thanh menu bên trái của Supabase, chọn mục **SQL Editor** (biểu tượng `>_`).
2. Bấm nút **"New query"**.
3. Mở file [schema.sql](schema.sql) trong thư mục dự án, copy toàn bộ nội dung và dán vào ô soạn thảo SQL.
4. Bấm nút **"Run"** (hoặc phím tắt `Ctrl + Enter`).
5. Hệ thống sẽ báo `Success. No rows returned` ➔ Toàn bộ các bảng `citizen_feedbacks`, `villages`, `categories`, `admin_users` và chính sách bảo mật RLS đã được khởi tạo xong 100%!

---

## BƯỚC 3: LẤY THÔNG TIN KẾT NỐI VÀ DÁN VÀO TRANG WEB

1. Trên menu Supabase, chọn **Project Settings** (biểu tượng bánh răng ⚙️ ở góc dưới cùng bên trái) > Chọn mục **Data API**.
2. Tìm và sao chép 2 thông số sau:
   - **Project URL**: Có dạng `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **anon public Key**: Một chuỗi ký tự dài bắt đầu bằng `eyJhbGciOi...`
3. Mở trang quản trị của bạn: [https://lehanhkt01-gif.github.io/ykien/](https://lehanhkt01-gif.github.io/ykien/)
4. Đăng nhập Cán bộ > Mở **`📊 Cán bộ Tiếp nhận`** > Bấm vào nút **`🐘 PostgreSQL`**.
5. Dán **Project URL** và **Anon Key** vào 2 ô tương ứng > Bấm **"⚡ Kiểm Tra Kết Nối"** > Bấm **"💾 Lưu Cấu Hình"**.
6. Bấm **"🔄 Đồng Bộ Toàn Bộ Dữ Liệu Từ PostgreSQL"** để tải dữ liệu về bảng.

---

## 🛡️ TÍNH NĂNG ĐỒNG BỘ NỔI BẬT

- **Lưu đồng thời đa tầng:** Khi cử tri gửi phản ánh, hệ thống sẽ tự động ghi đồng thời vào **PostgreSQL Database** + **Google Sheets & Google Drive** + **LocalStorage**.
- **Tra cứu thời gian thực:** Cử tri có thể tra cứu mã hồ sơ trực tiếp từ PostgreSQL.
- **Cập nhật phản hồi:** Khi cán bộ nhập trả lời trên bảng quản lý, nội dung sẽ được cập nhật trực tiếp vào PostgreSQL.
