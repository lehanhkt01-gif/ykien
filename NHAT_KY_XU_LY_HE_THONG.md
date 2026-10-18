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
4. **Gộp cột "Ngày ý kiến" vào dòng "Thôn / Buôn" & Tô đậm nội dung**:
   - Cột Ngày ý kiến được đưa vào chung ô với Thôn/Buôn: dòng trên hiển thị `📍 [Tên thôn/buôn]`, dòng dưới hiển thị `📅 [Ngày/tháng/năm]` gọn gàng, tiết kiệm diện tích.
   - Nội dung ý kiến được định dạng **tô đậm** (`font-bold text-slate-900`) giúp cử tri và người dân dễ dàng đọc lướt các phản ánh trên màn hình.


---

## 📌 3. YÊU CẦU 3: THIẾT LẬP NÚT XUẤT FILE CÓ LỰA CHỌN NỘI DUNG XUẤT

Đã nâng cấp chức năng **"Xuất file Excel"** tại [app/admin/page.tsx](file:///d:/Antigravity/2.%20ykien%20var/app/admin/page.tsx) cùng 2 endpoint API [app/api/admin/export/route.ts](file:///d:/Antigravity/2.%20ykien%20var/app/api/admin/export/route.ts) và [app/api/admin/export/[filename]/route.ts](file:///d:/Antigravity/2.%20ykien%20var/app/api/admin/export/%5Bfilename%5D/route.ts):

### 3.1. Các tùy chọn nội dung xuất:
1. **Xuất toàn bộ**: Tải tất cả hồ sơ có trong hệ thống không phân biệt trạng thái.
2. **Chưa có nội dung trả lời**: Chỉ xuất các hồ sơ đang xác minh, thẩm tra, xử lý hoặc chờ duyệt (chưa có câu trả lời).
3. **Đã có trả lời**: Chỉ xuất các hồ sơ đã có nội dung văn bản trả lời công khai.
4. **UBND xã trả lời**: Chỉ xuất các hồ sơ do Ủy ban Nhân dân Xã Ea Súp thụ lý và trả lời.
5. **MTTQ xã trả lời**: Chỉ xuất các hồ sơ do Ban Thường trực Ủy ban MTTQ Xã Ea Súp thụ lý và trả lời.
6. **Cơ quan khác trả lời**: Cho phép chọn cụ thể trong 9 cơ quan nhà nước / đoàn thể (HĐND, Công an, Quân sự, Trạm Y tế, Ban Địa chính - Môi trường, Bộ phận Một cửa...).

### 3.2. Kết hợp phạm vi dữ liệu & Tên file tự động:
- Cho phép xuất trên **Toàn bộ CSDL** hoặc **Theo bộ lọc tìm kiếm & Thôn/buôn hiện tại**.
- Hiển thị trực quan số lượng hồ sơ thực tế tương ứng với từng lựa chọn.
- Tự động đặt tên tệp Excel rõ ràng, ví dụ:
  - `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_2026-10-18_ToanBo_CSDL.xlsx`
  - `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_2026-10-18_CHUA_TRA_LOI_CSDL.xlsx`
  - `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_2026-10-18_DA_TRA_LOI_CSDL.xlsx`
  - `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_2026-10-18_UBND_Xa_tra_loi_CSDL.xlsx`
  - `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_2026-10-18_MTTQ_Xa_tra_loi_CSDL.xlsx`


---

---

## 📌 4. YÊU CẦU 4: THIẾT LẬP NÚT NHẬP FILE - BỔ SUNG CHẾ ĐỘ "NHẬP CÂU TRẢ LỜI" & CƠ CHẾ CẢNH BÁO

Đã nâng cấp chức năng **"Nhập file Excel"** tại [app/admin/page.tsx](file:///d:/Antigravity/2.%20ykien%20var/app/admin/page.tsx), [app/api/admin/import/route.ts](file:///d:/Antigravity/2.%20ykien%20var/app/api/admin/import/route.ts) và [lib/data-store.ts](file:///d:/Antigravity/2.%20ykien%20var/lib/data-store.ts):

### 4.1. Bổ sung 2 chế độ nạp file rõ ràng:
1. **Chế độ 1: Thêm hồ sơ ý kiến mới (`new_feedbacks`)**:
   - Sử dụng khi tiếp nhận danh sách ý kiến/phản ánh mới của cử tri từ các buổi tiếp xúc cử tri.
   - Hệ thống tự động tạo mã hồ sơ mới (`EASUP-PA-XXXXXX`), thiết lập trạng thái *"Đã tiếp nhận"* hoặc *"Đang xử lý"*.
2. **Chế độ 2: Nhập câu trả lời (`answers`)**:
   - Sử dụng khi cơ quan (UBND xã, MTTQ xã, các ban ngành) gửi file Excel tổng hợp các nội dung trả lời / giải quyết cử tri.
   - Hệ thống tự động đối chiếu theo **Mã hồ sơ** (`ticketCode` như `EASUP-PA-821964`) hoặc đối chiếu theo **Nội dung ý kiến** nếu không có mã.

### 4.2. Cơ chế xử lý an toàn & Cảnh báo thông minh:
- **Đối với hồ sơ CHƯA CÓ câu trả lời**:
  - Tự động nạp nội dung trả lời (`responseContent`), cơ quan trả lời (`answeringOrg`), người ký (`answeredBy`), văn bản đính kèm (`documentUrl`), ngày trả lời.
  - Tự động chuyển trạng thái hồ sơ sang *"Đã trả lời"*.
  - Tăng biến đếm `updatedCount`.
- **Đối với hồ sơ ĐÃ CÓ câu trả lời từ trước (Cơ chế bảo vệ dữ liệu)**:
  - Hệ thống phát hiện hồ sơ đã ở trạng thái *"Đã trả lời"* hoặc đã có nội dung văn bản giải quyết trước đó.
  - **Tự động BỎ QUA, KHÔNG GHI ĐÈ** để tránh làm mất mát hoặc sai lệch câu trả lời chính thức đã ban hành.
  - **Đưa ra cảnh báo chi tiết**: Ghi nhận mã hồ sơ, tên cử tri và cơ quan đã trả lời trước đó vào danh sách `warnings`.
  - Hiển thị khung cảnh báo màu vàng nổi bật kèm biểu tượng khiên bảo vệ `ShieldAlert` trong giao diện Quản trị với đầy đủ danh sách các hồ sơ bị bỏ qua và lý do chi tiết.

---

## 📌 5. QUY TRÌNH DEPLOY / CẬP NHẬT LÊN MÁY CHỦ VPS

Lệnh 1 dòng duy nhất để cập nhật code mới, bảo vệ file ratings và build lại container trên VPS:

```bash
cd /var/www/ykien.easupso.com && mv data/ratings.json /tmp/ratings.json.bak 2>/dev/null ; git pull origin main && docker compose build web && docker compose up -d web
```

---

## 📌 6. BẢNG TỔNG HỢP CÁC TỆP ĐÃ THAY ĐỔI
| STT | Đường dẫn tệp | Mục đích thay đổi |
|---|---|---|
| 1 | `lib/constants.ts` | Cập nhật `"Thôn Thành Công"` ➔ `"Thôn Thắng Lợi"` trong danh mục 20 thôn buôn chuẩn. |
| 2 | `app/page.tsx` | Hiển thị 2 dòng ý kiến cử tri (`line-clamp-2`), nhấp vào mở modal đọc chi tiết trọn vẹn; gộp Ngày ý kiến dưới Thôn/Buôn; tô đậm nội dung phản ánh. |
| 3 | `initial_data.json` | Cập nhật mã `THON_THANG_LOI`, tên thôn và dữ liệu mẫu phản ánh. |
| 4 | `app/api/chat/route.ts` | Đồng bộ danh sách 20 thôn buôn trong phản hồi của Trợ lý AI công vụ. |
| 5 | `app/api/admin/export/route.ts` | Đồng bộ tên Thôn Thắng Lợi; bổ sung lọc xuất theo nội dung (toàn bộ, chưa trả lời, đã trả lời, UBND, MTTQ, ban ngành). |
| 6 | `app/api/admin/export/[filename]/route.ts` | Đồng bộ tên Thôn Thắng Lợi và tham số lọc xuất file Excel. |
| 7 | `lib/data-store.ts` | Viết hàm `batchUpdateAnswers()` nạp câu trả lời theo mã hồ sơ, kiểm tra và chặn ghi đè nếu đã có trả lời, phát sinh cảnh báo chi tiết. |
| 8 | `app/api/admin/import/route.ts` | Hỗ trợ tham số `mode === "answers"`, tích hợp `batchUpdateAnswers()` và trích xuất dữ liệu trả lời. |
| 9 | `app/admin/page.tsx` | Nâng cấp Modal Xuất file (chọn nội dung xuất); Nâng cấp Modal Nhập file (2 chế độ Thêm mới / Nhập câu trả lời kèm khung hiển thị cảnh báo chi tiết). |
| 10 | `legacy/schema.sql` | Đồng bộ script cơ sở dữ liệu mẫu SQL sang Thôn Thắng Lợi. |
| 11 | `legacy/db.js` | Đồng bộ tệp cơ sở dữ liệu mẫu JavaScript sang Thôn Thắng Lợi. |
| 12 | `legacy/index.html` | Đồng bộ dropdown chọn thôn trong tệp HTML tĩnh. |
| 13 | `NHAT_KY_XU_LY_HE_THONG.md` | Tài liệu lưu trữ chi tiết toàn bộ lịch sử và hướng dẫn hệ thống cho các phiên làm việc tiếp theo. |

