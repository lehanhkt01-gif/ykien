# Kế hoạch xây dựng Website "Mặt trận Tổ quốc xã Ea Súp" & Tiếp nhận Phản ánh Cử tri

Website được xây dựng nhằm cung cấp thông tin, hỗ trợ người dân thông qua Chatbot AI và tiếp nhận ý kiến, phản ánh của cử tri. Giao diện được thiết kế chuyên nghiệp, trang trọng với tông màu chủ đạo là **Đỏ** và **Vàng**, tích hợp **nút Upload file đính kèm (không bắt buộc)**.

---

## User Review Required

> [!IMPORTANT]
> **1. Nút Upload File (Không bắt buộc):**
> - Cho phép cử tri đính kèm hình ảnh (JPG, PNG) hoặc tài liệu (PDF, DOCX) liên quan đến hiện trường hoặc văn bản phản ánh.
> - Tính năng này hoàn toàn **không bắt buộc** (optional); cử tri có thể gửi phản ánh mà không cần đính kèm tệp.
> - Hỗ trợ kéo thả file (drag & drop), hiển thị xem trước (preview ảnh/thông tin file) và nút xóa tệp nếu chọn nhầm.

> [!NOTE]
> **2. Tích hợp Chatbot ChatGPT:**
> - Chatbot trên nền tảng ChatGPT (`https://chatgpt.com/...`) sẽ được tích hợp dưới dạng nút bấm/banner nổi bật mở trong tab mới, đảm bảo trải nghiệm thuận tiện và an toàn.

---

## Phân tích Kỹ thuật & Giao diện

- **Công nghệ:** React + Vite (nhanh, nhẹ, hiện đại), Vanilla CSS với hiệu ứng mượt mà và chuẩn responsive (máy tính, máy tính bảng, điện thoại).
- **Màu sắc chủ đạo:**
  - **Đỏ truyền thống:** `#C8102E` / `#A60F26` (Màu cờ Tổ quốc, trang trọng, uy nghiêm)
  - **Vàng hoàng kim:** `#FFB81C` / `#F1A80A` (Màu ngôi sao vàng, điểm nhấn nổi bật)
  - **Nền & Card:** `#FFFFFF`, `#F8FAFC`, kết hợp bóng mờ (box-shadow) tinh tế.
- **Font chữ:** Font chữ hiện đại, rõ ràng tiếng Việt (Inter / Be Vietnam Pro / Roboto).

---

## Proposed Changes

### 1. Cấu trúc Dự án (Web App)

Dự án sẽ được triển khai trực tiếp trong thư mục:
`c:\Users\Windows\Desktop\Dropbox\HanhYahoo\Antigravity\Web trả lời cử tri`

```
Web trả lời cử tri/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Header.jsx           # Header trang trọng với Quốc huy & Tiêu đề
│   │   ├── HeroBanner.jsx       # Giới thiệu & Nút kết nối Chatbot AI
│   │   ├── FeedbackForm.jsx     # Form gửi ý kiến cử tri + Upload file (Optional)
│   │   ├── FaqSection.jsx       # Câu hỏi thường gặp & Quy trình xử lý
│   │   ├── FeedbackIframe.jsx   # Tab/Khung mở rộng trang cu-tri-phan-anh
│   │   └── Footer.jsx           # Thông tin liên hệ, hotline, địa chỉ Ea Súp
│   └── assets/                  # Biểu trưng, hình ảnh minh họa
```

---

### 2. Chi tiết các thành phần chính

#### [NEW] `src/components/Header.jsx`
- Biểu trưng Mặt trận Tổ quốc Việt Nam / Quốc huy trang trọng.
- Tiêu đề cấp cơ quan: *ỦY BAN MẶT TRẬN TỔ QUỐC VIỆT NAM XÃ EA SÚP*.
- Menu điều hướng nhanh: Trang chủ, Chatbot AI, Gửi phản ánh, Quy trình xử lý, Liên hệ.

#### [NEW] `src/components/HeroBanner.jsx`
- Khẩu hiệu: *"Lắng nghe dân - Tận tụy phục vụ - Đồng hành cùng Cử tri"*.
- Nút CTA nổi bật: **"Trò chuyện với Trợ lý AI Cử tri"** (mở tab ChatGPT).
- Nút dẫn nhanh tới **"Gửi ý kiến phản ánh"**.

#### [NEW] `src/components/FeedbackForm.jsx` *(Bổ sung tính năng Upload File)*
- Các trường thông tin phản ánh:
  - Họ và tên cử tri (tuỳ chọn/bắt buộc)
  - Số điện thoại / Email liên hệ
  - Địa bàn (Thôn / Buôn / Tổ dân phố tại xã Ea Súp)
  - Lĩnh vực: Đất đai, Môi trường, Giao thông, An ninh trật tự, Chính sách xã hội, Khác
  - Tiêu đề & Nội dung phản ánh (bắt buộc)
  - **Khu vực Tải tệp đính kèm (Không bắt buộc):**
    - Giao diện kéo thả file hoặc nhấn nút **"Chọn tệp đính kèm (Hình ảnh / PDF / Word)"**
    - Nhãn chú thích rõ: *(Không bắt buộc - Tối đa 5 file, mỗi file < 10MB)*
    - Danh sách file đã chọn: Xem trước thumbnail (với hình ảnh), tên file, dung lượng, nút xóa từng file
- Nút **"Gửi phản ánh"** kèm hiệu ứng loading, modal xác nhận thành công và cấp Mã tiếp nhận phản ánh.

#### [NEW] `src/components/FaqSection.jsx`
- Quy trình 4 bước tiếp nhận và xử lý kiến nghị cử tri (Tiếp nhận -> Phân loại -> Chuyển cơ quan giải quyết -> Trả lời công khai).

#### [NEW] `src/components/Footer.jsx`
- Thông tin trụ sở UBND & UBMTTQ xã Ea Súp, Tỉnh Đắk Lắk.
- Số điện thoại đường dây nóng, email tiếp nhận thông tin.

---

## Verification Plan

### Manual Verification
1. **Kiểm tra Giao diện & Thẩm mỹ:**
   - Đảm bảo tông màu Đỏ - Vàng trang nghiêm, hiện đại, bố cục rõ ràng, sắc nét.
   - Kiểm tra hiển thị responsive trên màn hình PC và Mobile.
2. **Kiểm tra Nút Upload File:**
   - Thử nghiệm gửi phản ánh **khi KHÔNG đính kèm file** (đảm bảo form vẫn gửi thành công, không báo lỗi bắt buộc).
   - Thử nghiệm chọn 1 hoặc nhiều ảnh/file, kiểm tra xem preview và nút xóa file có hoạt động mượt mà không.
3. **Kiểm tra các nút điều hướng:**
   - Nhấn nút "Trò chuyện với AI" để đảm bảo mở đúng đường dẫn ChatGPT trong tab mới.
   - Thử nghiệm gửi form phản ánh và kiểm tra thông báo hoàn tất.
