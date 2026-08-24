-- ============================================================
-- CƠ SỞ DỮ LIỆU POSTGRESQL - CỔNG TIẾP NHẬN Ý KIẾN CỬ TRI XÃ EA SÚP
-- Tương thích: PostgreSQL 12+, Supabase, Neon.tech, AWS RDS, Docker
-- ============================================================

-- 1. BẢNG DANH MỤC THÔN / BUÔN (20 ĐỊA BÀN XÃ EA SÚP)
CREATE TABLE IF NOT EXISTS villages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    village_type VARCHAR(20) NOT NULL CHECK (village_type IN ('Buôn', 'Thôn')),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG DANH MỤC LĨNH VỰC PHẢN ÁNH
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG HỒ SƠ Ý KIẾN / PHẢN ÁNH CỦA CỬ TRI
CREATE TABLE IF NOT EXISTS citizen_feedbacks (
    id BIGSERIAL PRIMARY KEY,
    ticket_code VARCHAR(50) NOT NULL UNIQUE, -- Mã hồ sơ (VD: EASUP-PA-892415)
    sender_name VARCHAR(150) DEFAULT 'Cử tri ẩn danh',
    sender_phone VARCHAR(50),
    sender_email VARCHAR(100),
    village VARCHAR(100) NOT NULL,
    village_name VARCHAR(100),
    category VARCHAR(150) NOT NULL,
    category_name VARCHAR(150),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,  -- Danh sách tệp đính kèm / ảnh base64 / URL Drive
    
    -- Trạng thái hồ sơ
    status_code VARCHAR(50) DEFAULT 'RECEIVED',
    status_label VARCHAR(100) DEFAULT 'Mới tiếp nhận',
    
    assigned_officer VARCHAR(100), -- Cán bộ thụ lý
    response_content TEXT,         -- Nội dung văn bản trả lời cử tri
    response_date TIMESTAMPTZ,
    
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo các chỉ mục (Indexes) để tăng tốc độ truy vấn tối đa
CREATE INDEX IF NOT EXISTS idx_feedbacks_ticket_code ON citizen_feedbacks(ticket_code);
CREATE INDEX IF NOT EXISTS idx_feedbacks_village ON citizen_feedbacks(village);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON citizen_feedbacks(status_code);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON citizen_feedbacks(created_at DESC);

-- 4. BẢNG TỆP TIN ĐÍNH KÈM CHI TIẾT
CREATE TABLE IF NOT EXISTS feedback_attachments (
    id BIGSERIAL PRIMARY KEY,
    ticket_code VARCHAR(50) NOT NULL REFERENCES citizen_feedbacks(ticket_code) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG TÀI KHOẢN CÁN BỘ TIẾP NHẬN & QUẢN TRỊ
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'OFFICER', -- ADMIN, OFFICER, LEADERSHIP
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CẤU HÌNH BẢO MẬT ROW LEVEL SECURITY (RLS) CHO POSTGRESQL / SUPABASE
-- ============================================================

-- Bật RLS
ALTER TABLE citizen_feedbacks ENABLE ROW LEVEL SECURITY;

-- 1. Cho phép mọi người (Anonymous / Public) gửi phản ánh mới (INSERT)
CREATE POLICY "Allow public insert feedbacks" 
ON citizen_feedbacks FOR INSERT 
WITH CHECK (true);

-- 2. Cho phép mọi người (Public) đọc/tra cứu hồ sơ (SELECT)
CREATE POLICY "Allow public read feedbacks" 
ON citizen_feedbacks FOR SELECT 
USING (true);

-- 3. Cho phép cập nhật trạng thái & nội dung trả lời (UPDATE)
CREATE POLICY "Allow update feedbacks" 
ON citizen_feedbacks FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 4. Cho phép xóa hồ sơ
CREATE POLICY "Allow delete feedbacks" 
ON citizen_feedbacks FOR DELETE 
USING (true);


-- ============================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA CHO XÃ EA SÚP)
-- ============================================================

-- Chèn 20 Thôn / Buôn
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
('THON_13', 'Thôn 13', 'Thôn', 20)
ON CONFLICT (code) DO NOTHING;

-- Chèn danh mục lĩnh vực
INSERT INTO categories (code, name, description, display_order) VALUES
('DAT_DAI', 'Đất đai, bồi thường & giải tỏa mặt bằng', 'Tranh chấp ranh giới, cấp quyền sử dụng đất, bồi thường đền bù', 1),
('GIAO_THONG', 'Đường giao thông nông thôn, kênh mương thủy lợi', 'Đường xuống cấp, cầu cống, mương dẫn nước phục vụ sản xuất', 2),
('MOI_TRUONG', 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt', 'Rác thải khu dân cư, ô nhiễm nguồn nước, chăn nuôi', 3),
('AN_NINH', 'An ninh trật tự thôn xóm, phòng chống tệ nạn', 'Trật tự an toàn nông thôn, camera an ninh, phòng ngừa tội phạm', 4),
('CHINH_SACH', 'Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết', 'BHYT, nhà đại đoàn kết, trợ cấp bảo trợ xã hội, vốn vay ưu đãi', 5),
('HANH_CHINH', 'Tinh thần phục vụ & Thủ tục hành chính', 'Thái độ cán bộ, thời gian giải quyết hồ sơ dịch vụ công', 6),
('KHAC', 'Lĩnh vực khác', 'Các kiến nghị và phản ánh khác của nhân dân', 7)
ON CONFLICT (code) DO NOTHING;

-- Chèn tài khoản cán bộ quản trị mặc định
INSERT INTO admin_users (username, password_hash, full_name, role, phone, email) VALUES
('admin', 'admin123', 'Quản Trị Viên Hệ Thống', 'ADMIN', '0262.3688.115', 'mttq.easup@daklak.gov.vn'),
('lehanh', '123456', 'Lê Hạnh - Ban Thường trực UBMTTQ', 'OFFICER', '0982.xxx.xxx', 'lehanhkt01@gmail.com')
ON CONFLICT (username) DO NOTHING;

-- Chèn phản ánh mẫu thực tế
INSERT INTO citizen_feedbacks (ticket_code, sender_name, sender_phone, village, village_name, category, category_name, title, content, status_code, status_label, response_content, created_at) VALUES
('EASUP-PA-892415', 'Trần Văn Mạnh', '0913.845.210', 'Buôn A', 'Buôn A', 'Đường giao thông nông thôn, kênh mương thủy lợi', 'Đường giao thông nông thôn, kênh mương thủy lợi', 'Kiến nghị sửa chữa dặm vá tuyến đường liên thôn qua Buôn A', 'Tuyến đường nội bộ qua Buôn A xuất hiện nhiều ổ gà sau các trận mưa lớn, gây khó khăn cho việc đi lại của bà con và học sinh.', 'COMPLETED', 'Đã hoàn tất xử lý', 'UBND xã Ea Súp đã tiến hành khảo sát thực địa và phân bổ nguồn kinh phí duy tu đường giao thông nông thôn, dự kiến hoàn tất dặm vá trong tháng 9/2026.', NOW() - INTERVAL '4 days'),
('EASUP-PA-671239', 'Nguyễn Thị Lành', '0988.123.456', 'Thôn Thành Công', 'Thôn Thành Công', 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt', 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt', 'Phản ánh tình trạng bãi rác tự phát gây ô nhiễm khu dân cư', 'Tại ngã ba đường liên thôn đoạn qua Thôn Thành Công có bãi rác tự phát tồn đọng lâu ngày bốc mùi hôi, đề nghị xã có biện pháp thu gom xử lý.', 'PROCESSING', 'Đang thẩm tra, xử lý', 'UBMTTQ xã đã kiến nghị UBND xã chỉ đạo Tổ Vệ sinh môi trường tiến hành thu gom, cắm biển cấm đổ rác và giao ban tự quản thôn giám sát.', NOW() - INTERVAL '3 days'),
('EASUP-PA-452108', 'Y Krông Niê', '0977.567.890', 'Buôn B', 'Buôn B', 'Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết', 'Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết', 'Đề nghị hướng dẫn hồ sơ hỗ trợ sửa chữa nhà Đại đoàn kết', 'Gia đình tôi thuộc diện hộ cận nghèo, nhà ở dột nát xuống cấp nghiêm trọng, muốn làm thủ tục xin hỗ trợ xây sửa nhà đại đoàn kết.', 'COMPLETED', 'Đã hoàn tất xử lý', 'Ban Vận động Quỹ Vì người nghèo xã Ea Súp đã cử cán bộ xuống thẩm định thực tế và đưa vào danh sách bình xét hỗ trợ đợt 2 năm 2026.', NOW() - INTERVAL '2 days')
ON CONFLICT (ticket_code) DO NOTHING;
