# Hệ Thống Tiếp Nhận & Trả Lời Ý Kiến Cử Tri - Xã Ea Súp

Hệ thống số hóa tiếp nhận, phân loại, giải quyết và trả lời kiến nghị, phản ánh của cử tri thuộc Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp.

## 🌟 Tính Năng Chính
- **Giao diện Tra cứu & Gửi ý kiến**: Cho phép người dân tra cứu tiến độ xử lý và gửi phản ánh kèm hình ảnh/tài liệu đính kèm.
- **Cổng Cán bộ Tiếp nhận & Xử lý**: Quản lý hồ sơ, cập nhật trạng thái giải quyết, phân loại lĩnh vực và phản hồi trực tiếp.
- **Tích hợp Tự động**: Kết nối Google Sheets và Google Drive lưu trữ hồ sơ và tệp đính kèm tự động theo thời gian thực.
- **Báo cáo & Thống kê**: Trực quan hóa tỷ lệ xử lý, phân loại theo địa bàn và chuyên mục.

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trực Tiếp
1. Mở tệp `index.html` trên trình duyệt web bất kỳ.
2. Hoặc triển khai trực tiếp thông qua **GitHub Pages** (Settings > Pages > Branch: `main` / `root`).

## 📁 Cấu Trúc Dự Án
- `index.html`: Giao diện chính của ứng dụng web.
- `app.js`: Logic tương tác người dùng, xử lý form và hiển thị dữ liệu.
- `db.js`: Quản lý lưu trữ cục bộ (LocalStorage) và đồng bộ dữ liệu.
- `styles.css`: Hệ thống giao diện responsive, hiện đại.
- `google_apps_script.js`: Mã nguồn Apps Script kết nối Google Sheets & Google Drive.
- `initial_data.json`: Dữ liệu mẫu khởi tạo ban đầu.
- `schema.sql`: Sơ đồ cấu trúc cơ sở dữ liệu.
- `HUONG_DAN_KET_NOI_GOOGLE_SHEETS.md`: Hướng dẫn chi tiết thiết lập Google Sheets.
