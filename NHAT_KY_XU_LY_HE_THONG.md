# NHẬT KÝ VÀ TÀI LIỆU QUÁ TRÌNH XỬ LÝ HỆ THỐNG
**Hệ thống Tiếng nói Cử tri - Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp**

> **Ngày thực hiện:** 18/10/2026  
> **Người thực hiện:** Đội ngũ Kỹ thuật & AI Assistant  
> **Mục tiêu:** Đồng bộ tên thôn hành chính và nâng cấp trải nghiệm người dùng trên bảng ý kiến cử tri.

---

## 📌 1. YÊU CẦU 1: ĐỔI TÊN THÔN "THÔN THÀNH CÔNG" THÀNH "THÔN THẮNG LỢI" VÀ ĐỒNG BỘ TOÀN HỆ THỐNG

### 1.1. Hiện trạng trước khi sửa
- Trong danh mục chuẩn 20 Thôn/Buôn của xã Ea Súp (ảnh 1), thôn thứ 4 đang hiển thị là `"Thôn Thành Công"`.
- Một số tệp cấu hình mẫu và script xuất báo cáo, chatbot vẫn lưu giữ tên cũ `"Thôn Thành Công"` / mã `THON_THANH_CONG`.
- Trong cơ sở dữ liệu `data/feedbacks.json`, các hồ sơ gửi lên thực tế đã mang tên `"Thôn Thắng Lợi"`.

### 1.2. Các tệp đã được chỉnh sửa và đồng bộ 100%
1. **[lib/constants.ts](file:///d:/Antigravity/2.%20ykien%20var/lib/constants.ts)**:
   - Cập nhật mảng hằng số `VILLAGES`: thay `"Thôn Thành Công"` bằng `"Thôn Thắng Lợi"`.
   - *Tác động:* Do toàn bộ hệ thống (`app/page.tsx`, `app/admin/page.tsx`, `components/VoterProfileModal.tsx`, `components/ReportExportModal.tsx`, `app/api/admin/import/route.ts`) đều import trực tiếp `VILLAGES` từ tệp này, việc cập nhật tự động đồng bộ tất cả dropdown lọc, form gửi ý kiến, form thêm mới/sửa hồ sơ cán bộ và logic import Excel.
2. **[initial_data.json](file:///d:/Antigravity/2.%20ykien%20var/initial_data.json)**:
   - Đổi mã định danh: `THON_THANH_CONG` ➔ `THON_THANG_LOI`.
   - Đổi tên thôn: `"Thôn Thành Công"` ➔ `"Thôn Thắng Lợi"`.
   - Cập nhật hồ sơ mẫu số 2 (`village_name`, tiêu đề phản ánh, nội dung công văn trả lời của UB MTTQ xã liên quan đến Ban Tự quản Thôn Thắng Lợi).
3. **[app/api/chat/route.ts](file:///d:/Antigravity/2.%20ykien%20var/app/api/chat/route.ts)**:
   - Cập nhật danh sách 20 thôn buôn của Trợ lý Ảo AI Công Vụ Xã Ea Súp để trả lời chính xác cho người dân khi hỏi về địa bàn hành chính: bao gồm 3 Buôn (A, B, C) và 17 Thôn (Thôn 1 - 13, Thôn Thắng Lợi, Thôn Hòa Bình, Thôn Đoàn Kết, Thôn Bình Lợi).
4. **[app/api/admin/export/route.ts](file:///d:/Antigravity/2.%20ykien%20var/app/api/admin/export/route.ts)** & **[app/api/admin/export/[filename]/route.ts](file:///d:/Antigravity/2.%20ykien%20var/app/api/admin/export/[filename]/route.ts)**:
   - Đổi dòng dữ liệu mẫu xuất Excel sang `"Thôn Thắng Lợi"`.
5. **[legacy/schema.sql](file:///d:/Antigravity/2.%20ykien%20var/legacy/schema.sql)**, **[legacy/db.js](file:///d:/Antigravity/2.%20ykien%20var/legacy/db.js)**, **[legacy/index.html](file:///d:/Antigravity/2.%20ykien%20var/legacy/index.html)**:
   - Cập nhật toàn bộ các cấu hình khởi tạo, bảng dữ liệu mẫu và dropdown tương thích sang `"Thôn Thắng Lợi"` / `THON_THANG_LOI`.

### 1.3. Kết quả kiểm tra
- Toàn bộ codebase không còn bất kỳ dòng code hay chuỗi ký tự nào chứa `"Thôn Thành Công"` hay `THON_THANH_CONG`.
- Khớp 100% với cơ sở dữ liệu thực tế tại `data/feedbacks.json`.

---

## 📌 2. YÊU CẦU 2: HIỂN THỊ NỘI DUNG Ý KIẾN KHOẢNG 2 DÒNG, NHẤP VÀO ĐỌC ĐẦY ĐỦ NỘI DUNG

### 2.1. Hiện trạng trước khi sửa (Ảnh 2)
- Cột **"NỘI DUNG Ý KIẾN"** trên bảng danh sách chỉ hiển thị duy nhất một nút bấm màu xám `[ 👁️ Xem nội dung ]` và huy hiệu số tệp đính kèm.
- Người dân/cử tri khi xem bảng không nắm bắt được tóm tắt nội dung vấn đề phản ánh nếu không bấm từng nút một.

### 2.2. Giải pháp thực hiện tại [app/page.tsx](file:///d:/Antigravity/2.%20ykien%20var/app/page.tsx)
1. **Tiêu đề cột (`<thead>`)**:
   - Chuyển `th` từ căn giữa hạn hẹp `w-36` sang căn trái linh hoạt `min-w-[220px] max-w-[340px]` để hiển thị văn bản đẹp mắt, cân đối với các cột TT, Cử tri, Thôn buôn, Trả lời và Đánh giá.
2. **Nội dung ô (`<tbody>`)**:
   - Hiển thị văn bản phản ánh của cử tri (`item.content`) với thuộc tính `line-clamp-2`: tự động hiển thị tối đa khoảng 2 dòng và có dấu ba chấm `...` nếu nội dung dài hơn.
   - Thêm hiệu ứng tương tác:
     - Toàn bộ khối văn bản có `cursor-pointer`, khi rê chuột chuyển nền `hover:bg-blue-50/80` và viền nhẹ `hover:border-blue-200`.
     - Chữ chuyển sắc thái đậm hơn `group-hover:text-blue-800`.
     - Phía dưới hiển thị nhãn liên kết rõ ràng: `👁️ Xem đầy đủ` (có gạch chân khi hover) cùng huy hiệu số lượng tệp đính kèm (nếu hồ sơ có tệp).
3. **Mở Modal đọc chi tiết đầy đủ**:
   - Khi nhấp vào bất kỳ điểm nào trong khối 2 dòng (hoặc nút "Xem đầy đủ"), hàm `setSelectedContentItem(item)` được gọi, kích hoạt ngay Modal phóng to rộng rãi:
     - Hiển thị đầy đủ 100% văn bản phản ánh không bị giới hạn độ dài.
     - Hiển thị đầy đủ thông tin: Mã hồ sơ (ví dụ `EASUP-PA-821964`), Ngày gửi, Họ tên cử tri, Địa bàn Thôn/buôn, Lĩnh vực.
     - Hiển thị danh sách tệp đính kèm (hình ảnh chụp hiện trường, tài liệu PDF/DOCX) kèm ảnh thu nhỏ (preview) và nút tải về trực tiếp.

---

## 📌 3. QUY TRÌNH DEPLOY / CẬP NHẬT LÊN MÁY CHỦ VPS

Khi triển khai các cập nhật này lên máy chủ VPS (đang chạy Docker Compose):

```bash
# 1. Đăng nhập vào VPS hoặc thư mục dự án
cd /app/ykien  # hoặc đường dẫn dự án trên VPS

# 2. Kéo code mới nhất từ git (nếu quản lý qua git)
git pull origin main

# 3. Chạy script build lại container Docker
bash scripts/rebuild-docker.sh
# Hoặc chạy trực tiếp bằng docker-compose:
docker compose build web
docker compose up -d web
```

---

## 📌 4. BẢNG TỔNG HỢP CÁC TỆP ĐÃ THAY ĐỔI
| STT | Đường dẫn tệp | Mục đích thay đổi |
|---|---|---|
| 1 | `lib/constants.ts` | Cập nhật `"Thôn Thành Công"` ➔ `"Thôn Thắng Lợi"` trong danh mục 20 thôn buôn chuẩn. |
| 2 | `app/page.tsx` | Hiển thị 2 dòng ý kiến cử tri (`line-clamp-2`), nhấp vào mở modal đọc chi tiết trọn vẹn. |
| 3 | `initial_data.json` | Cập nhật mã `THON_THANG_LOI`, tên thôn và dữ liệu mẫu phản ánh. |
| 4 | `app/api/chat/route.ts` | Đồng bộ danh sách 20 thôn buôn trong phản hồi của Trợ lý AI công vụ. |
| 5 | `app/api/admin/export/route.ts` | Đồng bộ tên Thôn Thắng Lợi trong mẫu xuất dữ liệu Excel. |
| 6 | `app/api/admin/export/[filename]/route.ts` | Đồng bộ tên Thôn Thắng Lợi trong endpoint xuất file Excel. |
| 7 | `legacy/schema.sql` | Đồng bộ script cơ sở dữ liệu mẫu SQL sang Thôn Thắng Lợi. |
| 8 | `legacy/db.js` | Đồng bộ tệp cơ sở dữ liệu mẫu JavaScript sang Thôn Thắng Lợi. |
| 9 | `legacy/index.html` | Đồng bộ dropdown chọn thôn trong tệp HTML tĩnh. |
| 10 | `NHAT_KY_XU_LY_HE_THONG.md` | Tài liệu lưu trữ chi tiết quá trình xử lý cho các phiên làm việc tiếp theo. |
