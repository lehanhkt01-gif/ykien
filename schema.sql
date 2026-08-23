-- ============================================================
-- CƠ SỞ DỮ LIỆU CỔNG TIẾP NHẬN Ý KIẾN & TRẢ LỜI CỬ TRI
-- ỦY BAN MẶT TRẬN TỔ QUỐC VIỆT NAM XÃ EA SÚP, TỈNH ĐẮK LẮK
-- Hỗ trợ: SQLite, MySQL, PostgreSQL, Microsoft SQL Server
-- ============================================================

-- 1. BẢNG DANH MỤC THÔN / BUÔN (20 ĐỊA BÀN XÃ EA SÚP)
CREATE TABLE IF NOT EXISTS villages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    village_type ENUM('Buôn', 'Thôn') NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG DANH MỤC LĨNH VỰC PHẢN ÁNH
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG HỒ SƠ Ý KIẾN / PHẢN ÁNH CỦA CỬ TRI
CREATE TABLE IF NOT EXISTS citizen_feedbacks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_code VARCHAR(30) NOT NULL UNIQUE, -- Mã hồ sơ (VD: EASUP-PA-892415)
    sender_name VARCHAR(150) DEFAULT 'Cử tri ẩn danh',
    sender_phone VARCHAR(20) NULL,
    sender_email VARCHAR(100) NULL,
    village_id INT NOT NULL,
    village_name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    category_name VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Trạng thái hồ sơ:
    -- 1: Mới tiếp nhận
    -- 2: Đang thẩm tra, xác minh
    -- 3: Đã chuyển cơ quan chuyên môn giải quyết
    -- 4: Đã hoàn tất có văn bản trả lời
    -- 5: Từ chối / Không thuộc thẩm quyền
    status_code VARCHAR(30) DEFAULT 'RECEIVED',
    status_label VARCHAR(100) DEFAULT 'Mới tiếp nhận',
    
    assigned_officer VARCHAR(100) NULL, -- Cán bộ thụ lý
    response_content TEXT NULL,         -- Nội dung văn bản trả lời cử tri
    response_date DATETIME NULL,
    
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,     -- Cho phép hiển thị trên chuyên mục công khai
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_code (ticket_code),
    INDEX idx_village (village_id),
    INDEX idx_status (status_code),
    INDEX idx_created_at (created_at)
);

-- 4. BẢNG TỆP TIN ĐÍNH KÈM (HÌNH ẢNH / TÀI LIỆU MINH CHỨNG - KHÔNG BẮT BUỘC)
CREATE TABLE IF NOT EXISTS feedback_attachments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    feedback_id BIGINT NOT NULL,
    ticket_code VARCHAR(30) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_path TEXT NOT NULL,            -- Đường dẫn lưu trữ trên máy chủ hoặc Cloud Storage
    thumbnail_path TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (feedback_id) REFERENCES citizen_feedbacks(id) ON DELETE CASCADE,
    INDEX idx_attachment_ticket (ticket_code)
);

-- 5. BẢNG LỊCH SỬ TIẾN ĐỘ XỬ LÝ HỒ SƠ (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS feedback_progress_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    feedback_id BIGINT NOT NULL,
    ticket_code VARCHAR(30) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    performed_by VARCHAR(100) DEFAULT 'Hệ thống',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (feedback_id) REFERENCES citizen_feedbacks(id) ON DELETE CASCADE
);

-- 6. BẢNG TÀI KHOẢN CÁN BỘ TIẾP NHẬN & QUẢN TRỊ
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'OFFICER', -- ADMIN, OFFICER, LEADERSHIP
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ============================================================

-- Chèn 20 Thôn / Buôn của Xã Ea Súp theo đúng thứ tự chuẩn
INSERT INTO villages (code, name, village_type, display_order) VALUES
('BUON_A', 'Buôn A', 'Buôn', 1),
('BUON_B', 'Buôn B', 'Buôn', 2),
('BUON_C', 'Buôn C', 'Buôn', 3),
('THON_THANH_CONG', 'Thôn Thành Công', 'Thôn', 4),
('THON_HOA_BINH', 'Thôn Hòa Bình', 'Thôn', 5),
('THON_DOAN_KET', 'Thôn Đoàn Kết', 'Thôn', 6),
('THON_BINH_LOI', 'Thôn Bình Lợi', 'Thôn', 7),
('THON_1', 'Thôn 1', 'Thôn', 8),
('THON_2', 'Thôn 2', 'Thôn', 9),
('THON_3', 'Thôn 3', 'Thôn', 10),
('THON_4', 'Thôn 4', 'Thôn', 11),
('THON_5', 'Thôn 5', 'Thôn', 12),
('THON_6', 'Thôn 6', 'Thôn', 13),
('THON_7', 'Thôn 7', 'Thôn', 14),
('THON_8', 'Thôn 8', 'Thôn', 15),
('THON_9', 'Thôn 9', 'Thôn', 16),
('THON_10', 'Thôn 10', 'Thôn', 17),
('THON_11', 'Thôn 11', 'Thôn', 18),
('THON_12', 'Thôn 12', 'Thôn', 19),
('THON_13', 'Thôn 13', 'Thôn', 20);

-- Chèn danh mục lĩnh vực
INSERT INTO categories (code, name, description, display_order) VALUES
('DAT_DAI', 'Đất đai, bồi thường & giải tỏa mặt bằng', 'Tranh chấp ranh giới, cấp quyền sử dụng đất, bồi thường đền bù', 1),
('GIAO_THONG', 'Đường giao thông nông thôn, kênh mương thủy lợi', 'Đường xuống cấp, cầu cống, mương dẫn nước phục vụ sản xuất', 2),
('MOI_TRUONG', 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt', 'Rác thải khu dân cư, ô nhiễm nguồn nước, chăn nuôi', 3),
('AN_NINH', 'An ninh trật tự thôn xóm, phòng chống tệ nạn', 'Trật tự an toàn nông thôn, camera an ninh, phòng ngừa tội phạm', 4),
('CHINH_SACH', 'Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết', 'BHYT, nhà đại đoàn kết, trợ cấp bảo trợ xã hội, vốn vay ưu đãi', 5),
('HANH_CHINH', 'Tinh thần phục vụ & Thủ tục hành chính', 'Thái độ cán bộ, thời gian giải quyết hồ sơ dịch vụ công', 6),
('KHAC', 'Lĩnh vực khác', 'Các kiến nghị và phản ánh khác của nhân dân', 7);

-- Chèn hồ sơ phản ánh mẫu
INSERT INTO citizen_feedbacks (
    ticket_code, sender_name, sender_phone, village_id, village_name, 
    category_id, category_name, title, content, status_code, status_label, 
    assigned_officer, response_content, response_date, created_at
) VALUES 
(
    'EASUP-PA-892415', 'Trần Văn Mạnh', '0913845***', 1, 'Buôn A', 
    2, 'Đường giao thông nông thôn, kênh mương thủy lợi', 
    'Kiến nghị sửa chữa dặm vá tuyến đường liên thôn qua Buôn A',
    'Tuyến đường nội bộ qua Buôn A xuất hiện nhiều ổ gà sau các trận mưa lớn, gây khó khăn cho việc đi lại của bà con và học sinh.',
    'COMPLETED', 'Đã hoàn tất xử lý', 'Ban Thường trực MTTQ Xã',
    'UBND xã Ea Súp đã tiến hành khảo sát thực địa và phân bổ nguồn kinh phí duy tu đường giao thông nông thôn, dự kiến hoàn tất dặm vá trong tháng 9/2026.',
    '2026-08-21 09:30:00', '2026-08-20 08:15:00'
),
(
    'EASUP-PA-671239', 'Nguyễn Thị Lành', '0988123***', 4, 'Thôn Thành Công', 
    3, 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt',
    'Phản ánh điểm tập kết rác thải tự phát gần khu dân cư Thôn Thành Công',
    'Thời gian gần đây có một số hộ tập kết rác sai quy định bốc mùi hôi thối, đề nghị Ban MTTQ và chính quyền có biện pháp tuyên truyền, xử lý.',
    'PROCESSING', 'Đang thẩm tra, xử lý', 'Tổ Quản lý Môi trường Xã',
    'Ủy ban MTTQ xã đã gửi văn bản đề nghị Tổ quản lý trật tự & môi trường xã phối hợp cùng Ban Tự quản Thôn Thành Công kiểm tra, thu gom rác trong 48 giờ tới.',
    NULL, '2026-08-22 14:20:00'
);
