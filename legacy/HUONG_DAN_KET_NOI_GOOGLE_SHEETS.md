# HƯỚNG DẪN KẾT NỐI TỰ ĐỘNG VỀ GOOGLE SHEETS & GOOGLE DRIVE
### Dành cho tài khoản: `lehanhkt01@gmail.com`
### Cơ quan: Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp

Hệ thống đã được tích hợp tính năng:
- **Tự động thêm dòng thông tin vào Bảng tính Google Sheets**.
- **Tự động lưu toàn bộ tệp đính kèm (Ảnh JPG/PNG, Tài liệu PDF/Word) vào thư mục `"HỒ SƠ PHẢN ÁNH CỬ TRI - XÃ EA SÚP"` trên Google Drive của bạn**.
- **Tự động chèn link xem tệp Google Drive vào từng dòng tương ứng trên Google Sheets**.

---

## 📌 BƯỚC 1: Mở Bảng tính Google Sheets
1. Đăng nhập tài khoản **`lehanhkt01@gmail.com`**.
2. Mở Bảng tính Google Sheets mà bạn đã tạo.

---

## 📌 BƯỚC 2: Cập nhật mã Google Apps Script
1. Trên thanh menu Google Sheets, chọn **Tiện ích mở rộng** (Extensions) ➔ **Apps Script**.
2. Xóa toàn bộ mã cũ và copy toàn bộ nội dung trong tệp **[google_apps_script.js](file:///c:/Users/Windows/Desktop/Dropbox/HanhYahoo/Antigravity/Web%20tr%E1%BA%A3%20l%E1%BB%9Di%20c%E1%BB%AD%20tri/google_apps_script.js)** dán vào.
3. Nhấn **Ctrl + S** (hoặc nút 💾 Lưu) để lưu mã.

---

## 📌 BƯỚC 3: Triển khai phiên bản mới (Deploy New Version)
1. Bấm nút màu xanh **Triển khai** (Deploy) ở góc trên bên phải ➔ Chọn **Quản lý tùy chọn triển khai** (Manage deployments).
2. Bấm vào biểu tượng cây bút **Chỉnh sửa** (Edit) bên cạnh mục triển khai hiện tại.
3. Tại dòng *Phiên bản* (Version): Bấm chọn **Phiên bản mới** (New version).
4. Đảm bảo mục *Ai có quyền truy cập* (Who has access) là **`Bất kỳ ai (Anyone)`**.
5. Bấm nút **Triển khai** (Deploy).
6. Copy **URL ứng dụng web** nhận được (có dạng: `https://script.google.com/macros/s/.../exec`).

---

## 📌 BƯỚC 4: Dán vào Website và Bấm Thử Nghiệm
1. Mở website tại [index.html](file:///c:/Users/Windows/Desktop/Dropbox/HanhYahoo/Antigravity/Web%20tr%E1%BA%A3%20l%E1%BB%9Di%20c%E1%BB%AD%20tri/index.html).
2. Bấm vào nút **`📊 Cán bộ Tiếp nhận`** trên menu.
3. Dán URL vào ô màu xanh lá cây và bấm **`💾 Lưu Kết Nối`**.
4. Bấm nút màu xanh dương **`🧪 Gửi Dòng Thử Nghiệm`**.

---

### 🎉 KẾT QUẢ:
1. Mở **Google Sheets**: Bạn sẽ thấy dòng dữ liệu thử nghiệm xuất hiện.
2. Mở [Google Drive](https://drive.google.com): Bạn sẽ thấy xuất hiện một thư mục tên là **`"HỒ SƠ PHẢN ÁNH CỬ TRI - XÃ EA SÚP"`**, bên trong chứa tệp tin do người dân gửi kèm theo đường link xem trực tiếp!
