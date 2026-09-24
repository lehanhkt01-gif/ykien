export interface AttachmentSeedType {
  name: string;
  url: string;
  size: number;
  type: string;
  ext?: string;
}

export interface InitialFeedbackType {
  ticketCode: string;
  voterName: string;
  phone?: string | null;
  village: string;
  category: string;
  content: string;
  status: string;
  createdAt: Date;
  ratingVerySatisfied?: number;
  ratingSatisfied?: number;
  ratingUnsatisfied?: number;
  attachments?: AttachmentSeedType[];
  response?: {
    answeringOrg: string;
    responseContent: string;
    documentUrl?: string | null;
    answeredBy: string;
    answeredAt: Date;
  };
}

export const initialFeedbacks: InitialFeedbackType[] = [
  {
    ticketCode: "EASUP-PA-892415",
    voterName: "Trần Văn Mạnh",
    phone: "0913.845.210",
    village: "Buôn A",
    category: "Đường giao thông nông thôn, kênh mương thủy lợi",
    content: "Tuyến đường nội bộ qua Buôn A xuất hiện nhiều ổ gà sau các trận mưa lớn, gây khó khăn cho việc đi lại của bà con và các cháu học sinh đến trường. Đề nghị xã sớm có phương án tu sửa, dặm vá bê tông.",
    status: "Đã trả lời",
    createdAt: new Date("2026-08-20T08:15:00Z"),
    ratingVerySatisfied: 15,
    ratingSatisfied: 4,
    ratingUnsatisfied: 0,
    attachments: [
      {
        name: "Hinh_anh_duong_buon_A_sut_lun.png",
        url: "/logo.png",
        size: 194596,
        type: "image",
        ext: ".png",
      },
      {
        name: "Don_de_nghi_sua_chua_duong.pdf",
        url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
        size: 512000,
        type: "pdf",
        ext: ".pdf",
      },
    ],
    response: {
      answeringOrg: "Ủy ban Nhân dân xã Ea Súp",
      responseContent: "UBND xã Ea Súp đã tiến hành khảo sát thực địa và trích nguồn kinh phí duy tu đường giao thông nông thôn năm 2026. Công trình dặm vá đã hoàn thành nghiệm thu đưa vào sử dụng, bảo đảm an toàn giao thông cho bà con Buôn A.",
      documentUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
      answeredBy: "Nguyễn Văn Hùng - Phó Chủ tịch UBND xã",
      answeredAt: new Date("2026-08-25T14:30:00Z"),
    },
  },
  {
    ticketCode: "EASUP-PA-671239",
    voterName: "Nguyễn Thị Lành",
    phone: "0988.123.456",
    village: "Thôn Thành Công",
    category: "Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt",
    content: "Tại ngã ba đường liên thôn đoạn qua Thôn Thành Công xuất hiện bãi rác tự phát tồn đọng lâu ngày bốc mùi hôi thối, ruồi muỗi phát sinh gây nguy cơ dịch bệnh. Đề nghị xã có giải pháp thu gom và xử lý nghiêm các trường hợp vi phạm.",
    status: "Đang xử lý",
    createdAt: new Date("2026-08-22T14:20:00Z"),
  },
  {
    ticketCode: "EASUP-PA-452108",
    voterName: "Y Krông Niê",
    phone: "0977.654.321",
    village: "Buôn B",
    category: "Đất đai, bồi thường & giải tỏa mặt bằng",
    content: "Gia đình tôi có mảnh đất khai hoang từ năm 1998 nay muốn đo đạc cấp đổi sang Giấy chứng nhận quyền sử dụng đất mới (sổ hồng), xin hỏi cần chuẩn bị các giấy tờ gì và nộp tại bộ phận nào của xã?",
    status: "Đã tiếp nhận",
    createdAt: new Date("2026-08-23T09:10:00Z"),
  },
  {
    ticketCode: "EASUP-PA-319874",
    voterName: "Lê Văn Hùng",
    phone: "0905.897.123",
    village: "Thôn 1",
    category: "Đường giao thông nông thôn, kênh mương thủy lợi",
    content: "Đoạn mương dẫn nước từ hồ đập thủy lợi vào cánh đồng Thôn 1 bị bồi lắng phù sa và cỏ rác phủ kín, ảnh hưởng nghiêm trọng đến nguồn nước tưới cho hơn 20ha hoa màu vụ mới của bà con. Kiến nghị xã cho nạo vét khơi thông dòng chảy.",
    status: "Đã trả lời",
    createdAt: new Date("2026-08-23T11:45:00Z"),
    response: {
      answeringOrg: "Ủy ban Nhân dân xã Ea Súp",
      responseContent: "UBND xã đã giao Hợp tác xã Nông nghiệp và Ban Quản lý Thôn 1 huy động máy múc nạo vét thông luồng 1.200m tuyến kênh chính, hoàn thành cung cấp nước tưới tiêu thông suốt cho vụ sản xuất.",
      documentUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
      answeredBy: "Nguyễn Văn Hùng - Phó Chủ tịch UBND xã",
      answeredAt: new Date("2026-08-27T09:30:00Z"),
    },
  },
  {
    ticketCode: "EASUP-PA-208915",
    voterName: "H'Hen Mlô",
    phone: "0934.112.233",
    village: "Buôn C",
    category: "An ninh trật tự thôn xóm, phòng chống tệ nạn",
    content: "Khu vực ngã ba đường nhánh rẽ vào Buôn C buổi tối rất tối, tầm nhìn hạn chế, tiềm ẩn nguy cơ xảy ra va chạm giao thông và thanh niên tụ tập gây mất trật tự. Kiến nghị xã lắp đặt thêm đèn đường chiếu sáng.",
    status: "Đã trả lời",
    createdAt: new Date("2026-08-21T16:00:00Z"),
    response: {
      answeringOrg: "Ban Chỉ huy Công an xã Ea Súp",
      responseContent: "Công an xã đã phối hợp Đoàn Thanh niên xã triển khai công trình 'Ánh sáng an ninh - Thắp sáng đường quê', lắp đặt 04 bộ đèn năng lượng mặt trời công suất lớn tại ngã ba Buôn C, tăng cường tuần tra đảm bảo an ninh trật tự.",
      documentUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
      answeredBy: "Thiếu tá Hoàng Minh Tuấn - Trưởng Công an xã",
      answeredAt: new Date("2026-08-24T08:30:00Z"),
    },
  },
  {
    ticketCode: "EASUP-PA-110293",
    voterName: "Phạm Văn Đức",
    phone: "0945.334.455",
    village: "Thôn Đoàn Kết",
    category: "Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết",
    content: "Gia đình tôi thuộc diện cận nghèo có hoàn cảnh khó khăn, nhà ở mái tôn dột nát xuống cấp nặng sau mùa mưa bão. Mong muốn Ban MTTQ xã hướng dẫn điều kiện và cách thức đăng ký chương trình hỗ trợ xây sửa Nhà Đại đoàn kết năm 2026.",
    status: "Đã trả lời",
    createdAt: new Date("2026-08-24T07:30:00Z"),
    response: {
      answeringOrg: "Ban Thường trực Ủy ban MTTQ Việt Nam Xã Ea Súp",
      responseContent: "Ban Vận động Quỹ Vì người nghèo xã Ea Súp đã cử cán bộ phối hợp Ban công tác Mặt trận Thôn Đoàn Kết thẩm định trực tiếp hoàn cảnh. Hộ gia đình đã được đưa vào danh sách đề xuất hỗ trợ kinh phí 50.000.000 VNĐ trong đợt 2 năm 2026.",
      documentUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
      answeredBy: "Lê Hạnh - Thường trực Ban Vận động Quỹ Vì người nghèo",
      answeredAt: new Date("2026-08-28T15:00:00Z"),
    },
  },
];
