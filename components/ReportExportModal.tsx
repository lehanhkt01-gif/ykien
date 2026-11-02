"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Inbox,
  ThumbsUp,
  Star,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  PieChart,
  RefreshCw,
  ChevronDown,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  FolderTree,
} from "lucide-react";
import * as XLSX from "xlsx";
import { VILLAGES, CATEGORIES } from "@/lib/constants";

export interface OfficialResponseType {
  id: number;
  answeringOrg: string;
  responseContent: string;
  documentUrl?: string | null;
  answeredAt: string;
  answeredBy: string;
}

export interface FeedbackItem {
  id: number;
  ticketCode: string;
  voterName: string;
  phone?: string | null;
  village: string;
  category: string;
  content: string;
  status: string;
  createdAt: string;
  ratingVerySatisfied?: number;
  ratingSatisfied?: number;
  ratingUnsatisfied?: number;
  officialResponse?: OfficialResponseType | null;
}

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedbacks: FeedbackItem[];
}

export type PeriodType = "ALL" | "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR" | "CUSTOM";
export type ReportScopeType = "ALL" | "UNANSWERED" | "ANSWERED";

// Chuyển đổi số sang chữ số La Mã cho các mảng lĩnh vực
const toRoman = (num: number): string => {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
  return roman[num - 1] || String(num);
};

// Gợi ý đơn vị chủ trì xác minh theo mảng lĩnh vực
const getDefaultAnsweringOrg = (category: string): string => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("đất đai") || cat.includes("tài nguyên") || cat.includes("địa chính") || cat.includes("gcnqsdđ")) {
    return "Ban Địa chính - Nông nghiệp - Xây dựng & Môi trường / UBND xã Ea Súp";
  }
  if (cat.includes("môi trường") || cat.includes("rác thải") || cat.includes("nước")) {
    return "Ban Địa chính - Môi trường phối hợp Đơn vị thu gom";
  }
  if (cat.includes("giao thông") || cat.includes("thủy lợi") || cat.includes("hạ tầng") || cat.includes("kênh mương")) {
    return "Bộ phận Giao thông - Thủy lợi - Xây dựng / UBND xã Ea Súp";
  }
  if (cat.includes("an ninh") || cat.includes("trật tự") || cat.includes("công an")) {
    return "Ban Chỉ huy Công an xã Ea Súp";
  }
  if (cat.includes("chế độ") || cat.includes("chính sách") || cat.includes("an sinh") || cat.includes("xã hội")) {
    return "Bộ phận Văn hóa - Xã hội & Lao động TBXH xã Ea Súp";
  }
  if (cat.includes("điện") || cat.includes("chiếu sáng")) {
    return "UBND xã Ea Súp phối hợp Điện lực Ea Súp";
  }
  return "Ủy ban Nhân dân xã Ea Súp";
};

// Chuẩn hóa văn bản tiếng Việt để tìm cụm từ con
const normalizeVi = (text: string): string => {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Trích xuất từ khóa nội dung chính (loại bỏ triệt để stop words chung chung của văn phong hành chính & hạ tầng)
const extractMainKeywords = (text: string): string[] => {
  if (!text) return [];
  const stopWords = new Set([
    "xin", "chao", "gui", "loi", "kinh", "thua", "cac", "cap", "lanh", "dao",
    "cung", "cu", "tri", "hoi", "nghi", "dai", "bieu", "nhan", "dan", "toi",
    "chung", "la", "va", "cua", "co", "de", "thi", "ma", "nhung", "rat", "mong",
    "cam", "on", "nay", "do", "duoc", "mot", "hai", "ba", "nhieu", "it", "khi",
    "luc", "trong", "tren", "duoi", "ngoai", "vao", "ra", "ve", "tai", "cho",
    "biet", "bao", "nam", "thang", "ngay", "hien", "qua", "lai", "len", "xuong",
    // Từ ngữ chung chung không đại diện cho công trình/vị trí cụ thể
    "duong", "tuyen", "doan", "khu", "vuc", "tinh", "trang", "hien", "nay",
    "di", "lai", "kho", "khan", "som", "dau", "tu", "sua", "chua", "lam",
    "nang", "cap", "be", "tong", "nhua", "dat", "mua", "ngap", "ung", "nuoc",
    "troi", "tron", "truot", "nghiem", "trong", "anh", "huong", "phuong", "tien",
    "xe", "co", "ba", "con", "hoc", "sinh", "sinh", "hoat", "san", "xuat",
    "de", "nghi", "yeu", "cau", "xem", "xet", "giai", "quyet", "kiem", "tra",
    "khao", "sat", "phuong", "an", "khac", "phuc", "som", "co", "quan", "chuc", "nang"
  ]);

  const clean = normalizeVi(text);
  const words = clean.split(" ").filter((w) => w.length >= 2 && !stopWords.has(w));
  return Array.from(new Set(words));
};

// ĐỐI CHIẾU NGUYÊN TẮC TÍNH TRÙNG:
// PHẢI TRÙNG ĐỒNG THỜI:
// 1. TÊN THÔN/BUÔN
// 2. MẢNG LĨNH VỰC
// 3. NỘI DUNG CHÍNH (ĐỊA DANH / CÔNG TRÌNH CỤ THỂ HOẶC CÙNG CỬ TRI GỬI LẶP LẠI)
// CÁC TRƯỜNG HỢP KHÔNG TRÙNG ĐỒNG THỜI THÌ GHI "KHÔNG TRÙNG"
const findDuplicateMatch = (target: FeedbackItem, allItems: FeedbackItem[]): FeedbackItem | null => {
  if (!target || !allItems || allItems.length === 0) return null;

  const targetVillageNorm = normalizeVi(target.village);
  const targetCategoryNorm = normalizeVi(target.category);
  const targetNorm = normalizeVi(target.content);
  const targetMainKeywords = extractMainKeywords(target.content);
  const targetName = normalizeVi(target.voterName || "");

  if (!targetVillageNorm || !targetCategoryNorm) return null;

  for (const other of allItems) {
    // Không đối chiếu với chính mình
    if (other.id === target.id || other.ticketCode === target.ticketCode) continue;

    // ĐIỀU KIỆN 1: BẮT BUỘC TRÙNG TÊN THÔN / BUÔN
    const otherVillageNorm = normalizeVi(other.village);
    if (!otherVillageNorm || targetVillageNorm !== otherVillageNorm) {
      continue; // Khác thôn/buôn => Loại ngay
    }

    // ĐIỀU KIỆN 2: BẮT BUỘC TRÙNG MẢNG LĨNH VỰC
    const otherCategoryNorm = normalizeVi(other.category);
    const sameCategory =
      targetCategoryNorm === otherCategoryNorm ||
      targetCategoryNorm.includes(otherCategoryNorm) ||
      otherCategoryNorm.includes(targetCategoryNorm);

    if (!sameCategory) {
      continue; // Khác mảng => Loại ngay
    }

    // ĐIỀU KIỆN 3: BẮT BUỘC TRÙNG NỘI DUNG CHÍNH TRONG THÔN ĐÓ
    const otherNorm = normalizeVi(other.content);
    const otherMainKeywords = extractMainKeywords(other.content);
    const otherName = normalizeVi(other.voterName || "");

    // 3.1. Cùng cử tri ở trong thôn đó gửi lặp lại về cùng mảng và có từ khóa đặc trưng chung
    const isSameVoter = targetName && otherName && targetName === otherName;
    if (isSameVoter) {
      const commonWords = targetMainKeywords.filter((k) => otherMainKeywords.includes(k));
      if (commonWords.length >= 1) {
        return other;
      }
    }

    // 3.2. Cùng nói về một địa danh, công trình, vị trí cụ thể trong thôn (cụm từ liên tiếp có ý nghĩa >= 7 ký tự)
    const targetWords = targetNorm.split(" ").filter(Boolean);
    let hasSpecificPhrase = false;
    for (let i = 0; i <= targetWords.length - 2; i++) {
      const w1 = targetWords[i];
      const w2 = targetWords[i + 1];
      const bigram = `${w1} ${w2}`;
      if (
        (targetMainKeywords.includes(w1) || targetMainKeywords.includes(w2)) &&
        bigram.length >= 7 &&
        otherNorm.includes(bigram)
      ) {
        hasSpecificPhrase = true;
        break;
      }
    }
    if (hasSpecificPhrase) {
      return other;
    }

    // 3.3. Trùng ít nhất 2 từ khóa đặc trưng chính (địa danh, tên riêng, số hiệu...) trong cùng thôn
    const commonMainWords = targetMainKeywords.filter((k) => otherMainKeywords.includes(k));
    if (commonMainWords.length >= 2) {
      return other;
    }
  }

  return null;
};

export default function ReportExportModal({
  isOpen,
  onClose,
  feedbacks: initialFeedbacks,
}: ReportExportModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Giai đoạn lọc
  const [periodType, setPeriodType] = useState<PeriodType>("ALL");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedHalfYear, setSelectedHalfYear] = useState<number>(currentMonth <= 6 ? 1 : 2);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  // Tùy chọn phạm vi / loại báo cáo theo yêu cầu người dùng:
  // "UNANSWERED" = Chưa được trả lời công khai (tại mục chưa được xác minh xử lý)
  const [reportScope, setReportScope] = useState<ReportScopeType>("ALL");

  // Bộ lọc bổ sung
  const [selectedVillage, setSelectedVillage] = useState<string>("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");

  // Dữ liệu toàn bộ hồ sơ (tải tối đa để thống kê chính xác tuyệt đối)
  const [allFeedbacks, setAllFeedbacks] = useState<FeedbackItem[]>(initialFeedbacks);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);

  // Tải toàn bộ hồ sơ từ CSDL khi mở modal để thống kê chuẩn xác nhất
  useEffect(() => {
    if (!isOpen) return;

    const fetchAll = async () => {
      setLoadingAll(true);
      try {
        const res = await fetch("/api/feedback?limit=5000");
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setAllFeedbacks(data.items);
        } else {
          setAllFeedbacks(initialFeedbacks);
        }
      } catch (err) {
        console.error("Lỗi tải toàn bộ hồ sơ:", err);
        setAllFeedbacks(initialFeedbacks);
      } finally {
        setLoadingAll(false);
      }
    };

    fetchAll();
  }, [isOpen, initialFeedbacks]);

  // Xác định nhãn giai đoạn & khoảng ngày
  const { periodLabel, startDate, endDate } = useMemo(() => {
    let label = "";
    let start: Date | null = null;
    let end: Date | null = null;

    if (periodType === "MONTH") {
      label = `Tháng ${selectedMonth}/${selectedYear}`;
      start = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
      end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
    } else if (periodType === "QUARTER") {
      const qStartMonth = (selectedQuarter - 1) * 3;
      const qEndMonth = selectedQuarter * 3;
      label = `Quý ${selectedQuarter}/${selectedYear} (Tháng ${qStartMonth + 1} - ${qEndMonth})`;
      start = new Date(selectedYear, qStartMonth, 1, 0, 0, 0, 0);
      end = new Date(selectedYear, qEndMonth, 0, 23, 59, 59, 999);
    } else if (periodType === "HALF_YEAR") {
      if (selectedHalfYear === 1) {
        label = `6 tháng đầu năm ${selectedYear} (01/01 - 30/06/${selectedYear})`;
        start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
        end = new Date(selectedYear, 5, 30, 23, 59, 59, 999);
      } else {
        label = `6 tháng cuối năm ${selectedYear} (01/07 - 31/12/${selectedYear})`;
        start = new Date(selectedYear, 6, 1, 0, 0, 0, 0);
        end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      }
    } else if (periodType === "YEAR") {
      label = `Năm ${selectedYear} (01/01 - 31/12/${selectedYear})`;
      start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    } else if (periodType === "CUSTOM") {
      label = `Giai đoạn từ ${customFrom ? new Date(customFrom).toLocaleDateString("vi-VN") : "..."} đến ${
        customTo ? new Date(customTo).toLocaleDateString("vi-VN") : "..."
      }`;
      if (customFrom) start = new Date(customFrom + "T00:00:00");
      if (customTo) end = new Date(customTo + "T23:59:59");
    } else {
      label = "Toàn bộ thời gian (Lũy kế hệ thống)";
      start = null;
      end = null;
    }

    return { periodLabel: label, startDate: start, endDate: end };
  }, [
    periodType,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedHalfYear,
    customFrom,
    customTo,
  ]);

  // Kiểm tra hồ sơ đã có câu trả lời công khai hay chưa
  const hasOfficialAnswer = (item: FeedbackItem): boolean => {
    return (
      item.status === "Đã trả lời" &&
      Boolean(item.officialResponse && item.officialResponse.responseContent && item.officialResponse.responseContent.trim())
    );
  };

  // Lọc danh sách theo giai đoạn, thôn/buôn và lĩnh vực (Tập dữ liệu gốc trong kỳ)
  const baseFilteredFeedbacks = useMemo(() => {
    return allFeedbacks.filter((item) => {
      const itemDate = new Date(item.createdAt);

      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;

      if (selectedVillage !== "Tất cả" && item.village !== selectedVillage) return false;
      if (selectedCategory !== "Tất cả" && item.category !== selectedCategory) return false;

      return true;
    });
  }, [allFeedbacks, startDate, endDate, selectedVillage, selectedCategory]);

  // Tính toán số liệu thống kê toàn kỳ
  const stats = useMemo(() => {
    const total = baseFilteredFeedbacks.length;
    const answered = baseFilteredFeedbacks.filter((f) => hasOfficialAnswer(f)).length;
    
    // Đang xác minh, xử lý: các hồ sơ đang trong quy trình xác minh hoặc chưa trả lời
    const processing = baseFilteredFeedbacks.filter(
      (f) => !hasOfficialAnswer(f) && (f.status === "Đang xác minh, xử lý" || f.status === "Đang xử lý")
    ).length;

    // Chờ tiếp nhận phân loại hoặc mới gửi
    const received = baseFilteredFeedbacks.filter(
      (f) => !hasOfficialAnswer(f) && f.status !== "Đang xác minh, xử lý" && f.status !== "Đang xử lý"
    ).length;

    // Tổng số chưa được trả lời công khai (đang xác minh xử lý + chờ tiếp nhận)
    const unanswered = total - answered;

    const resolutionRate = total > 0 ? ((answered / total) * 100).toFixed(1) : "100.0";
    const unansweredRate = total > 0 ? ((unanswered / total) * 100).toFixed(1) : "0.0";

    // Số lượt đánh giá của cử tri
    const ratingVery = baseFilteredFeedbacks.reduce((sum, f) => sum + (f.ratingVerySatisfied || 0), 0);
    const ratingSat = baseFilteredFeedbacks.reduce((sum, f) => sum + (f.ratingSatisfied || 0), 0);
    const ratingUnsat = baseFilteredFeedbacks.reduce((sum, f) => sum + (f.ratingUnsatisfied || 0), 0);
    const totalRatings = ratingVery + ratingSat + ratingUnsat;

    const pctVery = totalRatings > 0 ? ((ratingVery / totalRatings) * 100).toFixed(1) : "0.0";
    const pctSat = totalRatings > 0 ? ((ratingSat / totalRatings) * 100).toFixed(1) : "0.0";
    const pctUnsat = totalRatings > 0 ? ((ratingUnsat / totalRatings) * 100).toFixed(1) : "0.0";
    const overallSatisfaction =
      totalRatings > 0
        ? (((ratingVery + ratingSat) / totalRatings) * 100).toFixed(1)
        : "100.0";

    // Thống kê theo Lĩnh vực (cho toàn bộ hồ sơ)
    const categoryStats = CATEGORIES.map((cat) => {
      const count = baseFilteredFeedbacks.filter((f) => f.category === cat).length;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      return { category: cat, count, pct };
    }).sort((a, b) => b.count - a.count);

    // Thống kê theo Thôn/Buôn
    const villageStats = VILLAGES.map((vil) => {
      const count = baseFilteredFeedbacks.filter((f) => f.village === vil).length;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      return { village: vil, count, pct };
    }).sort((a, b) => b.count - a.count);

    return {
      total,
      answered,
      processing,
      received,
      unanswered,
      resolutionRate,
      unansweredRate,
      ratingVery,
      ratingSat,
      ratingUnsat,
      totalRatings,
      pctVery,
      pctSat,
      pctUnsat,
      overallSatisfaction,
      categoryStats,
      villageStats,
    };
  }, [baseFilteredFeedbacks]);

  // Lọc danh sách hồ sơ cần đưa vào báo cáo dựa trên reportScope
  const finalFeedbacks = useMemo(() => {
    if (reportScope === "UNANSWERED") {
      return baseFilteredFeedbacks.filter((f) => !hasOfficialAnswer(f));
    }
    if (reportScope === "ANSWERED") {
      return baseFilteredFeedbacks.filter((f) => hasOfficialAnswer(f));
    }
    return baseFilteredFeedbacks;
  }, [baseFilteredFeedbacks, reportScope]);

  // PHÂN THEO TỪNG MẢNG (LĨNH VỰC) CHO BÁO CÁO CHI TIẾT
  const groupedFeedbacksByCategory = useMemo(() => {
    const groups: { [category: string]: FeedbackItem[] } = {};

    finalFeedbacks.forEach((item) => {
      const cat = item.category || "Lĩnh vực khác";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    // Sắp xếp các mảng theo số lượng ý kiến giảm dần
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [finalFeedbacks]);

  // Thống kê riêng cho các mảng của hồ sơ đang báo cáo
  const activeCategorySummary = useMemo(() => {
    const totalCount = finalFeedbacks.length;
    return groupedFeedbacksByCategory.map(([cat, list], idx) => ({
      index: idx + 1,
      category: cat,
      count: list.length,
      pct: totalCount > 0 ? ((list.length / totalCount) * 100).toFixed(1) : "0.0",
      answeringOrg: getDefaultAnsweringOrg(cat),
    }));
  }, [groupedFeedbacksByCategory, finalFeedbacks]);

  // ==============================================================
  // XUẤT FILE EXCEL BÁO CÁO (TỰ ĐỘNG THÍCH ỨNG THEO TÙY CHỌN BÁO CÁO)
  // ==============================================================
  const handleExportReportExcel = () => {
    const wb = XLSX.utils.book_new();
    const isUnansweredMode = reportScope === "UNANSWERED";
    const reportTitle = isUnansweredMode
      ? "BÁO CÁO CÁC Ý KIẾN CỬ TRI CHƯA ĐƯỢC TRẢ LỜI CÔNG KHAI (ĐANG XÁC MINH, XỬ LÝ)"
      : reportScope === "ANSWERED"
      ? "BÁO CÁO CÁC Ý KIẾN CỬ TRI ĐÃ ĐƯỢC TRẢ LỜI CÔNG KHAI"
      : "BÁO CÁO TỔNG HỢP KẾT QUẢ TIẾP NHẬN, GIẢI QUYẾT VÀ ĐÁNH GIÁ Ý KIẾN CỬ TRI";

    // 1. SHEET 1: TỔNG HỢP THEO TỪNG MẢNG & CHỈ TIÊU
    const summaryRows: any[] = [
      ["ỦY BAN MẶT TRẬN TỔ QUỐC VIỆT NAM XÃ EA SÚP", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
      ["BAN THƯỜNG TRỰC", "", "Độc lập - Tự do - Hạnh phúc"],
      [`Số: ..... /BC-MTTQ-BTT`, "", `Ea Súp, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`],
      ["", "", ""],
      [reportTitle, "", ""],
      [`Kỳ báo cáo: ${periodLabel}`, "", ""],
      [`Phạm vi lọc: ${isUnansweredMode ? "Chưa được trả lời công khai (Đang xác minh, xử lý)" : reportScope === "ANSWERED" ? "Đã trả lời công khai" : "Toàn bộ ý kiến cử tri"}`, "", ""],
      [`Thời điểm lập: ${new Date().toLocaleString("vi-VN")}`, "", ""],
      ["", "", ""],
      ["I. TỔNG HỢP TÌNH HÌNH TIẾP NHẬN VÀ XỬ LÝ", "", "", ""],
      ["Chỉ tiêu", "Số lượng (Hồ sơ)", "Tỷ lệ (%)", "Ghi chú"],
      ["Tổng số ý kiến tiếp nhận trong kỳ", stats.total, "100%", "Tổng hợp toàn hệ thống"],
      ["Đã ban hành văn bản trả lời công khai", stats.answered, `${stats.resolutionRate}%`, "Cử tri đã có thể tra cứu"],
      [
        "Chưa được trả lời công khai (Đang xác minh, xử lý)",
        stats.unanswered,
        `${stats.unansweredRate}%`,
        "Cần đôn đốc xác minh giải quyết",
      ],
      ["- Trong đó: Đang xác minh, thụ lý hiện trường", stats.processing, `${stats.total > 0 ? ((stats.processing / stats.total) * 100).toFixed(1) : "0"}%`, "Cơ quan chuyên môn đang xử lý"],
      ["- Trong đó: Chờ tiếp nhận, phân loại thẩm tra", stats.received, `${stats.total > 0 ? ((stats.received / stats.total) * 100).toFixed(1) : "0"}%`, "Mới tiếp nhận"],
      ["", "", "", ""],
      ["II. TỔNG HỢP CÁC Ý KIẾN ĐƯỢC PHÂN THEO TỪNG MẢNG (LĨNH VỰC)", "", "", ""],
      ["STT", "Mảng / Lĩnh vực phản ánh", "Số lượng ý kiến", "Tỷ lệ (%)", "Đơn vị chủ trì xác minh xử lý"],
      ...activeCategorySummary.map((c) => [
        c.index,
        c.category,
        c.count,
        `${c.pct}%`,
        c.answeringOrg,
      ]),
      ["", "", "", ""],
      ["", "Người lập biểu", "", "TM. BAN THƯỜNG TRỰC UB MTTQ XÃ EA SÚP"],
      ["", "(Ký, ghi rõ họ tên)", "", "CHỦ TỊCH / PHÓ CHỦ TỊCH"],
      ["", "", "", "(Ký tên, đóng dấu)"],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 22 }, { wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "TongHop_TheoMang");

    // 2. SHEET 2: DANH SÁCH CHI TIẾT ĐƯỢC PHÂN THEO TỪNG MẢNG, NỘI DUNG CHI TIẾT, TÊN NGƯỜI Ý KIẾN, THÔN BUÔN
    // 2. SHEET 2: DANH SÁCH CHI TIẾT ĐƯỢC PHÂN THEO TỪNG MẢNG, NỘI DUNG CHI TIẾT, TÊN NGƯỜI Ý KIẾN, THÔN BUÔN
    const detailHeaders = [
      "STT",
      "Mảng / Lĩnh vực",
      "Mã hồ sơ",
      "Họ và tên người ý kiến",
      "Thôn / Buôn",
      "Số điện thoại",
      "Nội dung chi tiết của ý kiến cử tri",
      "Ngày tiếp nhận",
      "Mảng phụ trách",
      "Trùng lắp ý kiến",
      "Nội dung trả lời (nếu có)",
      "Ngày trả lời",
      "Người ký trả lời",
    ];

    // Gom dữ liệu theo mảng để xuất bảng chi tiết rõ ràng
    const detailRows: any[] = [];
    let globalIndex = 1;

    groupedFeedbacksByCategory.forEach(([categoryName, itemsInCategory]) => {
      // Dòng phân mảng nổi bật
      detailRows.push([
        `MẢNG: ${categoryName.toUpperCase()} (${itemsInCategory.length} Ý KIẾN)`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      itemsInCategory.forEach((item) => {
        const org = item.officialResponse?.answeringOrg || getDefaultAnsweringOrg(item.category);
        const dupMatch = findDuplicateMatch(item, allFeedbacks);
        const dupText = dupMatch
          ? `Trùng với ý kiến của cử tri ${dupMatch.voterName || "Cử tri"} (${dupMatch.village || ""}) - Mã: ${dupMatch.ticketCode} | Đơn vị: ${dupMatch.officialResponse?.answeringOrg || getDefaultAnsweringOrg(dupMatch.category)} | Nội dung: "${dupMatch.content}"`
          : "Không trùng";

        // Yêu cầu 1: Báo cáo các trường hợp chưa trả lời (reportScope === "UNANSWERED")
        // tuyệt đối không tự đưa câu trả lời vào, để trống các cột trả lời
        const answerContent = reportScope === "UNANSWERED" ? "" : (item.officialResponse?.responseContent || "");
        const answeredAt = reportScope === "UNANSWERED" ? "" : (item.officialResponse?.answeredAt ? new Date(item.officialResponse.answeredAt).toLocaleDateString("vi-VN") : "");
        const answeredBy = reportScope === "UNANSWERED" ? "" : (item.officialResponse?.answeredBy || "");

        detailRows.push([
          globalIndex++,
          item.category,
          item.ticketCode,
          item.voterName,
          item.village,
          item.phone || "",
          item.content,
          new Date(item.createdAt).toLocaleDateString("vi-VN"),
          org,
          dupText,
          answerContent,
          answeredAt,
          answeredBy,
        ]);
      });
    });

    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    wsDetail["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },
      { wch: 55 },
      { wch: 14 },
      { wch: 38 },
      { wch: 60 },
      { wch: 45 },
      { wch: 14 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "ChiTiet_TheoTungMang");

    // Tên file xuất Excel
    const safePeriodName = periodLabel.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
    const filePrefix = isUnansweredMode
      ? "Bao_cao_y_kien_cu_tri_CHUA_TRA_LOI_CONG_KHAI_Xa_Ea_Sup"
      : reportScope === "ANSWERED"
      ? "Bao_cao_y_kien_cu_tri_DA_TRA_LOI_CONG_KHAI_Xa_Ea_Sup"
      : "Bao_cao_tong_hop_y_kien_cu_tri_Xa_Ea_Sup";

    const filename = `${filePrefix}_${safePeriodName}.xlsx`;

    try {
      XLSX.writeFile(wb, filename);
    } catch (e) {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 60000);
    }
  };

  // ==============================================================
  // XUẤT FILE WORD (.DOC) ĐÚNG THỂ THỨC THÔNG TƯ 30 / NGHỊ ĐỊNH 30 CỦA CHÍNH PHỦ
  // ==============================================================
  const handleExportWord = () => {
    const isUnansweredMode = reportScope === "UNANSWERED";
    const reportTitle = isUnansweredMode
      ? "BÁO CÁO TỔNG HỢP CÁC Ý KIẾN, KIẾN NGHỊ CỦA CỬ TRI CHƯA ĐƯỢC TRẢ LỜI CÔNG KHAI"
      : reportScope === "ANSWERED"
      ? "BÁO CÁO KẾT QUẢ GIẢI QUYẾT VÀ TRẢ LỜI CÔNG KHAI Ý KIẾN CỬ TRI"
      : "BÁO CÁO TỔNG HỢP KẾT QUẢ TIẾP NHẬN, GIẢI QUYẾT VÀ ĐÁNH GIÁ Ý KIẾN CỬ TRI";

    const subTitle = isUnansweredMode
      ? "(Hiện đang trong quá trình thẩm tra, xác minh và xử lý)"
      : "";

    const currentDate = new Date();
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Sinh HTML các dòng bảng tổng hợp theo mảng
    const summaryRowsHtml = activeCategorySummary
      .map(
        (c) => `
        <tr>
          <td align="center" style="border: 1px solid black; padding: 5px 6px; font-size: 11pt;">${c.index}</td>
          <td style="border: 1px solid black; padding: 5px 6px; font-size: 11pt; font-weight: bold;">${c.category}</td>
          <td align="center" style="border: 1px solid black; padding: 5px 6px; font-size: 11pt; font-weight: bold; color: #990000;">${c.count}</td>
          <td align="center" style="border: 1px solid black; padding: 5px 6px; font-size: 11pt;">${c.pct}%</td>
          <td style="border: 1px solid black; padding: 5px 6px; font-size: 11pt;">${c.answeringOrg}</td>
        </tr>`
      )
      .join("");

    // Sinh HTML các mảng chi tiết
    let detailSectionsHtml = "";
    groupedFeedbacksByCategory.forEach(([categoryName, itemsInCategory], mIdx) => {
      const itemsHtml = itemsInCategory
        .map((item, idx) => {
          const isAnswered = hasOfficialAnswer(item);
          const org = item.officialResponse?.answeringOrg || getDefaultAnsweringOrg(item.category);
          const dupMatch = findDuplicateMatch(item, allFeedbacks);

          // Yêu cầu 1: Không được tự bịa ra câu trả lời (phải do cán bộ nhập câu trả lời mới được thống kê,
          // lưu ý các trường hợp trong báo cáo chưa trả lời đều chưa có văn bản trả lời)
          const showAnswer = reportScope !== "UNANSWERED" && isAnswered && Boolean(item.officialResponse?.responseContent);
          const answeredContent = showAnswer
            ? `<div style="margin-top: 4px; padding: 4px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-size: 9.5pt;">
                <strong>✓ Kết quả giải quyết của ${org}:</strong> ${item.officialResponse!.responseContent}
               </div>`
            : "";

          // Yêu cầu 2: Các trường hợp không trùng đồng thời thì ghi "Không trùng"
          const dupWordHtml = dupMatch
            ? `<div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 5px; border-radius: 4px; font-size: 9.5pt; color: #991b1b; text-align: left;">
                <div style="font-weight: bold; margin-bottom: 2px;">⚠️ Trùng với ý kiến của cử tri:</div>
                <div>• <strong>Họ tên:</strong> ${dupMatch.voterName || "Cử tri"} (${dupMatch.village || ""})</div>
                <div>• <strong>Mã:</strong> ${dupMatch.ticketCode}</div>
                <div>• <strong>Đơn vị:</strong> ${dupMatch.officialResponse?.answeringOrg || getDefaultAnsweringOrg(dupMatch.category)}</div>
                <div style="margin-top: 2px;">• <strong>Nội dung:</strong> <em>"${dupMatch.content.length > 180 ? dupMatch.content.slice(0, 180) + '...' : dupMatch.content}"</em></div>
               </div>`
            : `<span style="color: #64748b; font-size: 9.5pt;">Không trùng</span>`;

          return `
            <tr>
              <td align="center" valign="top" style="border: 1px solid black; padding: 5px 6px; font-size: 10pt;">${idx + 1}</td>
              <td valign="top" style="border: 1px solid black; padding: 5px 6px; font-size: 10pt;">
                <strong>${item.voterName || "Cử tri Ea Súp"}</strong><br/>
                <span>Địa bàn: <strong>${item.village}</strong></span><br/>
                ${item.phone ? `<span style="font-size: 9.5pt; color: #444;">SĐT: ${item.phone}</span><br/>` : ""}
                <span style="font-size: 9pt; color: #666;">Mã: ${item.ticketCode}</span>
              </td>
              <td valign="top" style="border: 1px solid black; padding: 5px 6px; font-size: 10pt; text-align: justify;">
                ${item.content}
                ${answeredContent}
              </td>
              <td align="center" valign="top" style="border: 1px solid black; padding: 5px 6px; font-size: 10pt; white-space: nowrap;">
                ${new Date(item.createdAt).toLocaleDateString("vi-VN")}
              </td>
              <td valign="top" style="border: 1px solid black; padding: 5px 6px; font-size: 10pt;">
                <strong>${org}</strong>
              </td>
              <td valign="top" style="border: 1px solid black; padding: 5px 6px; font-size: 9.5pt;">
                ${dupWordHtml}
              </td>
            </tr>`;
        })
        .join("");

      detailSectionsHtml += `
        <div style="margin-top: 14pt; margin-bottom: 8pt; page-break-inside: avoid;">
          <p style="margin: 6pt 0 4pt 0; font-weight: bold; font-size: 12pt; text-transform: uppercase;">
            MẢNG ${toRoman(mIdx + 1)}: ${categoryName} (Gồm ${itemsInCategory.length} ý kiến)
          </p>
          <table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; border: 1px solid black; width: 100%;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th width="4%" align="center" style="border: 1px solid black; padding: 6px; font-size: 10pt;">STT</th>
                <th width="18%" align="left" style="border: 1px solid black; padding: 6px; font-size: 10pt;">Người ý kiến & Thôn/Buôn</th>
                <th width="32%" align="left" style="border: 1px solid black; padding: 6px; font-size: 10pt;">Nội dung chi tiết của ý kiến cử tri</th>
                <th width="10%" align="center" style="border: 1px solid black; padding: 6px; font-size: 10pt;">Ngày nhận</th>
                <th width="16%" align="left" style="border: 1px solid black; padding: 6px; font-size: 10pt;">Mảng phụ trách</th>
                <th width="20%" align="left" style="border: 1px solid black; padding: 6px; font-size: 10pt;">Trùng lắp ý kiến</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>`;
    });

    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${reportTitle}</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 595.3pt 841.9pt; /* A4 */
            margin: 20mm 15mm 20mm 25mm; /* Chuẩn thể thức văn bản Nghị định 30/2020/NĐ-CP */
            mso-header-margin: 36.0pt;
            mso-footer-margin: 36.0pt;
            mso-paper-source: 0;
          }
          div.WordSection1 { page: WordSection1; }
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.35;
            color: #000000;
          }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          p { margin-top: 0; margin-bottom: 6pt; }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <!-- QUỐC HIỆU & TIÊU NGỮ THEO CHUẨN THỂ THỨC NGHỊ ĐỊNH 30/2020/NĐ-CP -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12pt;">
            <tr>
              <td width="43%" align="center" valign="top">
                <p style="margin: 0; font-size: 12pt; text-transform: uppercase;">ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP</p>
                <p style="margin: 0; font-size: 12pt; font-weight: bold; text-transform: uppercase;">BAN THƯỜNG TRỰC</p>
                <div style="border-bottom: 1.5pt solid black; width: 40%; margin: 2pt auto 4pt auto;"></div>
                <p style="margin: 0; font-size: 11pt;">Số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/BC-MTTQ-BTT</p>
              </td>
              <td width="57%" align="center" valign="top">
                <p style="margin: 0; font-size: 12pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p style="margin: 0; font-size: 13pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</p>
                <div style="border-bottom: 1.5pt solid black; width: 65%; margin: 2pt auto 4pt auto;"></div>
                <p style="margin: 0; font-size: 12pt; font-style: italic;">Ea Súp, ngày ${day} tháng ${month} năm ${year}</p>
              </td>
            </tr>
          </table>

          <!-- TIÊU ĐỀ BÁO CÁO -->
          <p style="margin-top: 14pt; margin-bottom: 3pt; text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase;">
            BÁO CÁO
          </p>
          <p style="margin-top: 0; margin-bottom: 3pt; text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase;">
            ${reportTitle}
          </p>
          ${subTitle ? `<p style="margin-top: 0; margin-bottom: 3pt; text-align: center; font-size: 12pt; font-weight: bold; font-style: italic;">${subTitle}</p>` : ""}
          <p style="margin-top: 0; margin-bottom: 14pt; text-align: center; font-size: 12pt; font-weight: bold; color: #b91c1c;">
            KỲ BÁO CÁO: ${periodLabel.toUpperCase()}
          </p>

          <!-- NƠI GỬI (KÍNH GỬI) -->
          <p style="margin-bottom: 2pt;"><strong>Kính gửi:</strong></p>
          <p style="margin: 0 0 2pt 20pt;">- Thường trực Đảng ủy xã Ea Súp;</p>
          <p style="margin: 0 0 2pt 20pt;">- Thường trực Hội đồng nhân dân xã Ea Súp;</p>
          <p style="margin: 0 0 10pt 20pt;">- Ủy ban nhân dân xã Ea Súp.</p>

          <!-- LỜI MỞ ĐẦU HÀNH CHÍNH CÔNG VỤ -->
          <p style="text-align: justify; text-indent: 20pt; line-height: 1.35; margin-bottom: 10pt;">
            Thực hiện chức năng đại diện, bảo vệ quyền và lợi ích hợp pháp, chính đáng của cử tri và Nhân dân; căn cứ Quy chế phối hợp công tác giữa Ban Thường trực Ủy ban MTTQ Việt Nam xã với Thường trực HĐND và UBND xã Ea Súp; Ban Thường trực Ủy ban MTTQ Việt Nam xã Ea Súp báo cáo tổng hợp danh sách các ý kiến, kiến nghị của cử tri trên địa bàn xã ${
              isUnansweredMode
                ? "<strong>chưa được ban hành văn bản trả lời công khai</strong> (hiện đang trong quá trình chuyển các cơ quan, đơn vị chuyên môn thẩm tra, xác minh và xử lý)"
                : ""
            } nhằm phục vụ công tác giám sát, đôn đốc giải quyết, cụ thể như sau:
          </p>

          <!-- I. TỔNG QUAN TÌNH HÌNH TIẾP NHẬN -->
          <p style="font-weight: bold; font-size: 13pt; margin-top: 10pt; margin-bottom: 6pt;">
            I. TÌNH HÌNH TIẾP NHẬN VÀ GIẢI QUYẾT Ý KIẾN CỬ TRI TRONG KỲ:
          </p>
          <p style="text-align: justify; text-indent: 20pt; margin-bottom: 4pt;">
            - Tổng số ý kiến tiếp nhận trong kỳ báo cáo: <strong>${stats.total}</strong> ý kiến.
          </p>
          <p style="text-align: justify; text-indent: 20pt; margin-bottom: 4pt;">
            - Số ý kiến đã ban hành văn bản trả lời công khai: <strong>${stats.answered}</strong> ý kiến (đạt tỷ lệ <strong>${stats.resolutionRate}%</strong>).
          </p>
          <p style="text-align: justify; text-indent: 20pt; margin-bottom: 8pt;">
            - Số ý kiến chưa được trả lời công khai (đang xác minh, xử lý): <strong>${stats.unanswered}</strong> ý kiến (chiếm tỷ lệ <strong>${stats.unansweredRate}%</strong>).
          </p>

          <!-- BẢNG TỔNG HỢP THEO MẢNG -->
          <p style="font-weight: bold; font-size: 12pt; margin-top: 8pt; margin-bottom: 4pt;">
            * Cơ cấu phân bố theo từng mảng lĩnh vực:
          </p>
          <table width="100%" border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; border: 1px solid black; width: 100%; margin-bottom: 12pt;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th width="8%" align="center" style="border: 1px solid black; padding: 6px; font-size: 11pt;">STT</th>
                <th width="42%" align="left" style="border: 1px solid black; padding: 6px; font-size: 11pt;">Mảng / Lĩnh vực phản ánh</th>
                <th width="15%" align="center" style="border: 1px solid black; padding: 6px; font-size: 11pt;">Số lượng ý kiến</th>
                <th width="12%" align="center" style="border: 1px solid black; padding: 6px; font-size: 11pt;">Tỷ lệ (%)</th>
                <th width="23%" align="left" style="border: 1px solid black; padding: 6px; font-size: 11pt;">Đơn vị chủ trì xác minh</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRowsHtml}
            </tbody>
          </table>

          <!-- II. BÁO CÁO CHI TIẾT NỘI DUNG Ý KIẾN PHÂN THEO TỪNG MẢNG -->
          <p style="font-weight: bold; font-size: 13pt; margin-top: 14pt; margin-bottom: 6pt;">
            II. NỘI DUNG CHI TIẾT CÁC Ý KIẾN CỬ TRI ĐƯỢC PHÂN THEO TỪNG MẢNG (${finalFeedbacks.length} HỒ SƠ):
          </p>
          ${detailSectionsHtml}

          <!-- III. KIẾN NGHỊ ĐÔN ĐỐC CỦA BAN THƯỜNG TRỰC UB MTTQ XÃ -->
          <p style="font-weight: bold; font-size: 13pt; margin-top: 16pt; margin-bottom: 6pt;">
            III. KIẾN NGHỊ ĐÔN ĐỐC CỦA BAN THƯỜNG TRỰC ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP:
          </p>
          <p style="text-align: justify; text-indent: 20pt; margin-bottom: 4pt;">
            1. Đề nghị Ủy ban nhân dân xã Ea Súp chỉ đạo các cơ quan chuyên môn (Ban Địa chính - Nông nghiệp - Xây dựng & Môi trường; Công an xã; Bộ phận Một cửa...) khẩn trương tiến hành kiểm tra thực tế, xác minh nội dung phản ánh của cử tri thuộc các mảng lĩnh vực nêu trên; đồng thời ban hành văn bản trả lời chính thức đúng thời hạn quy định để công khai cho cử tri được biết.
          </p>
          <p style="text-align: justify; text-indent: 20pt; margin-bottom: 4pt;">
            2. Đối với các vụ việc phức tạp, cần thời gian đo đạc, thẩm định nguồn gốc hoặc vượt thẩm quyền giải quyết của cấp xã, đề nghị UBND xã kịp thời có văn bản xin ý kiến chỉ đạo của UBND huyện Ea Súp và có thông báo tiến độ để cử tri an tâm.
          </p>
          <p style="text-align: justify; text-indent: 20pt; margin-bottom: 14pt;">
            3. Ban Thường trực Ủy ban MTTQ Việt Nam xã sẽ tiếp tục phân công cán bộ phối hợp kiểm tra, giám sát tiến độ giải quyết để thông báo công khai trước cử tri và Nhân dân tại kỳ họp HĐND và các hội nghị tiếp xúc cử tri sắp tới.
          </p>

          <!-- CHỮ KÝ VÀ NƠI NHẬN THEO ĐÚNG THỂ THỨC NGHỊ ĐỊNH 30/2020/NĐ-CP -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 14pt; page-break-inside: avoid;">
            <tr>
              <td width="50%" valign="top">
                <p style="margin: 0; font-size: 12pt; font-weight: bold; font-style: italic;">Nơi nhận:</p>
                <p style="margin: 0 0 2pt 10pt; font-size: 10.5pt; font-style: italic;">- Như Kính gửi;</p>
                <p style="margin: 0 0 2pt 10pt; font-size: 10.5pt; font-style: italic;">- Ban TT UBMTTQVN huyện Ea Súp (b/c);</p>
                <p style="margin: 0 0 2pt 10pt; font-size: 10.5pt; font-style: italic;">- Các Ban ngành, đoàn thể xã;</p>
                <p style="margin: 0 0 2pt 10pt; font-size: 10.5pt; font-style: italic;">- Ban Công tác Mặt trận 20 thôn, buôn;</p>
                <p style="margin: 0 0 10pt 10pt; font-size: 10.5pt; font-style: italic;">- Lưu: VT, Ban TT MTTQ.</p>

                <div style="margin-top: 16pt;">
                  <p style="margin: 0; font-size: 13pt; font-weight: bold; text-align: center;">NGƯỜI LẬP BIỂU</p>
                  <p style="margin: 0; font-size: 11pt; font-style: italic; text-align: center;">(Ký, ghi rõ họ tên)</p>
                  <div style="height: 60pt;"></div>
                </div>
              </td>
              <td width="50%" align="center" valign="top">
                <p style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase;">TM. BAN THƯỜNG TRỰC</p>
                <p style="margin: 0; font-size: 13pt; font-weight: bold; text-transform: uppercase;">CHỦ TỊCH / PHÓ CHỦ TỊCH</p>
                <p style="margin: 0; font-size: 11pt; font-style: italic;">(Ký tên, đóng dấu)</p>
                <div style="height: 60pt;"></div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + wordContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safePeriodName = periodLabel.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
    const prefix = isUnansweredMode
      ? "Bao_cao_y_kien_cu_tri_CHUA_TRA_LOI_CONG_KHAI_Xa_Ea_Sup"
      : reportScope === "ANSWERED"
      ? "Bao_cao_y_kien_cu_tri_DA_TRA_LOI_CONG_KHAI_Xa_Ea_Sup"
      : "Bao_cao_tong_hop_y_kien_cu_tri_Xa_Ea_Sup";
    a.download = `${prefix}_${safePeriodName}_Chuan_ND30.doc`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 60000);
  };

  // IN BÁO CÁO A4 HÀNH CHÍNH
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* HEADER MODAL (no-print) */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white flex items-center justify-between no-print flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                Xuất báo cáo thống kê ý kiến cử tri
              </h2>
              <p className="text-xs text-amber-200">
                Ủy ban MTTQ Việt Nam Xã Ea Súp, Tỉnh Đắk Lắk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO & TÙY CHỈNH LOẠI BÁO CÁO (no-print) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 no-print space-y-3.5 flex-shrink-0">
          {/* HÀNG 1: TÙY CHỌN LOẠI BÁO CÁO (ĐẶC BIỆT BỔ SUNG THEO YÊU CẦU NGƯỜI DÙNG) */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-red-700" />
                Tùy chỉnh loại báo cáo:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Lựa chọn 1: Báo cáo tổng hợp chung */}
              <button
                type="button"
                onClick={() => setReportScope("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  reportScope === "ALL"
                    ? "bg-slate-800 text-white shadow-xs ring-2 ring-slate-800/30"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                Tất cả ý kiến (Báo cáo tổng hợp)
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {stats.total}
                </span>
              </button>

              {/* LỰA CHỌN 2: CHƯA ĐƯỢC TRẢ LỜI CÔNG KHAI (MỤC ĐANG XÁC MINH XỬ LÝ) */}
              <button
                type="button"
                onClick={() => setReportScope("UNANSWERED")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  reportScope === "UNANSWERED"
                    ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40 font-extrabold"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
                }`}
                title="Bấm để xuất báo cáo riêng các hồ sơ cử tri chưa được trả lời công khai (đang xác minh, xử lý)"
              >
                <Clock className="w-3.5 h-3.5 text-amber-200" />
                Chưa được trả lời công khai (Đang xác minh, xử lý)
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    reportScope === "UNANSWERED"
                      ? "bg-white text-amber-800"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {stats.unanswered}
                </span>
              </button>

              {/* Lựa chọn 3: Đã trả lời công khai */}
              <button
                type="button"
                onClick={() => setReportScope("ANSWERED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  reportScope === "ANSWERED"
                    ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600/30 font-extrabold"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã trả lời công khai
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {stats.answered}
                </span>
              </button>
            </div>
          </div>

          {/* HÀNG 2: BỘ CHỌN KỲ BÁO CÁO */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-700" />
              Kỳ báo cáo:
            </span>

            {[
              { id: "ALL", label: "Tất cả thời gian" },
              { id: "MONTH", label: "Theo Tháng" },
              { id: "QUARTER", label: "Theo Quý" },
              { id: "HALF_YEAR", label: "Theo 6 Tháng" },
              { id: "YEAR", label: "Theo Năm" },
              { id: "CUSTOM", label: "Tùy chọn giai đoạn" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodType(p.id as PeriodType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  periodType === p.id
                    ? "bg-red-800 text-white shadow-xs font-bold"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* HÀNG 3: BỘ CHỌN CHI TIẾT & BỘ LỌC THÔN BUÔN / LĨNH VỰC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Năm */}
            {periodType !== "ALL" && periodType !== "CUSTOM" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Năm báo cáo
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
                >
                  {[2026, 2025, 2024, 2023].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chọn Tháng */}
            {periodType === "MONTH" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Tháng trong năm
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chọn Quý */}
            {periodType === "QUARTER" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Quý trong năm
                </label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
                >
                  <option value={1}>Quý I (Tháng 1 - Tháng 3)</option>
                  <option value={2}>Quý II (Tháng 4 - Tháng 6)</option>
                  <option value={3}>Quý III (Tháng 7 - Tháng 9)</option>
                  <option value={4}>Quý IV (Tháng 10 - Tháng 12)</option>
                </select>
              </div>
            )}

            {/* Chọn 6 Tháng */}
            {periodType === "HALF_YEAR" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Kỳ 6 tháng
                </label>
                <select
                  value={selectedHalfYear}
                  onChange={(e) => setSelectedHalfYear(Number(e.target.value))}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
                >
                  <option value={1}>6 tháng đầu năm (01/01 - 30/06)</option>
                  <option value={2}>6 tháng cuối năm (01/07 - 31/12)</option>
                </select>
              </div>
            )}

            {/* Tùy chọn ngày */}
            {periodType === "CUSTOM" && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </>
            )}

            {/* Lọc Thôn/Buôn */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Địa bàn Thôn/Buôn
              </label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
              >
                <option value="Tất cả">-- Tất cả 20 Thôn/Buôn --</option>
                {VILLAGES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Lĩnh vực */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Lĩnh vực phản ánh
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
              >
                <option value="Tất cả">-- Tất cả lĩnh vực --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Thanh hiển thị trạng thái lọc */}
          <div className="flex flex-wrap items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-600">
              Đang xem: <strong className="text-red-800 font-bold">{periodLabel}</strong> | Chế độ:{" "}
              <strong className={reportScope === "UNANSWERED" ? "text-amber-700 font-black" : "text-slate-900 font-bold"}>
                {reportScope === "UNANSWERED"
                  ? "Chưa được trả lời công khai (Đang xác minh, xử lý)"
                  : reportScope === "ANSWERED"
                  ? "Đã trả lời công khai"
                  : "Toàn bộ ý kiến tiếp nhận"}
              </strong>
              {selectedVillage !== "Tất cả" && ` | Địa bàn: ${selectedVillage}`}
              {selectedCategory !== "Tất cả" && ` | Lĩnh vực: ${selectedCategory}`}
            </span>
            <span className="text-slate-500 font-medium">
              Tìm thấy <strong className="text-slate-900 font-bold">{finalFeedbacks.length}</strong> hồ sơ phù hợp
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* NỘI DUNG XEM TRƯỚC BÁO CÁO & BẢN IN A4 CHUẨN THỂ THỨC MTTQ EA SÚP */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 printable-report bg-white">
          {/* 1. TIÊU ĐỀ VĂN BẢN CHUẨN THỂ THỨC MẶT TRẬN TỔ QUỐC XÃ EA SÚP */}
          <div className="border-b-2 border-slate-800 pb-4 avoid-break">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs uppercase font-bold text-slate-800">
                  ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
                </p>
                <p className="text-xs uppercase font-extrabold text-slate-900">
                  BAN THƯỜNG TRỰC
                </p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Số: ..... /BC-MTTQ-BTT</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-800">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </p>
                <p className="text-xs text-slate-800 font-bold border-b-2 border-slate-800 inline-block pb-0.5">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <p className="text-[11px] text-slate-600 italic mt-1 font-serif">
                  Ea Súp, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* TIÊU ĐỀ CHÍNH CỦA BÁO CÁO */}
            <div className="text-center mt-5">
              <h1 className="text-base sm:text-xl font-black uppercase text-slate-900 tracking-tight">
                {reportScope === "UNANSWERED" ? (
                  <>
                    BÁO CÁO TỔNG HỢP CÁC Ý KIẾN, KIẾN NGHỊ CỦA CỬ TRI
                    <br />
                    CHƯA ĐƯỢC TRẢ LỜI CÔNG KHAI
                    <span className="block text-sm font-bold text-amber-900 normal-case mt-0.5">
                      (Hiện đang trong quá trình thẩm tra, xác minh và xử lý)
                    </span>
                  </>
                ) : reportScope === "ANSWERED" ? (
                  <>BÁO CÁO KẾT QUẢ GIẢI QUYẾT VÀ TRẢ LỜI CÔNG KHAI Ý KIẾN CỬ TRI</>
                ) : (
                  <>BÁO CÁO TỔNG HỢP KẾT QUẢ TIẾP NHẬN, GIẢI QUYẾT VÀ ĐÁNH GIÁ Ý KIẾN CỬ TRI</>
                )}
              </h1>
              <p className="text-xs font-bold text-red-800 uppercase mt-1.5">
                KỲ BÁO CÁO: {periodLabel}
              </p>
            </div>
          </div>

          {/* DẪN NHẬP VĂN BẢN HÀNH CHÍNH CÔNG VỤ CỦA MTTQ (ĐẶC BIỆT KHI XUẤT Ý KIẾN CHƯA TRẢ LỜI) */}
          {reportScope === "UNANSWERED" && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-xs text-slate-800 space-y-2 avoid-break">
              <p className="font-bold">
                Kính gửi:
              </p>
              <ul className="list-disc pl-5 space-y-0.5 font-medium">
                <li>Thường trực Đảng ủy xã Ea Súp;</li>
                <li>Thường trực Hội đồng nhân dân xã Ea Súp;</li>
                <li>Ủy ban nhân dân xã Ea Súp.</li>
              </ul>
              <p className="text-justify leading-relaxed mt-2">
                Thực hiện chức năng đại diện, bảo vệ quyền và lợi ích hợp pháp, chính đáng của cử tri và Nhân dân; căn cứ Quy chế phối hợp công tác giữa Ban Thường trực Ủy ban MTTQ Việt Nam xã với Thường trực HĐND và UBND xã Ea Súp; Ban Thường trực Ủy ban MTTQ Việt Nam xã Ea Súp tổng hợp danh sách các ý kiến, kiến nghị của cử tri trên địa bàn xã <strong>chưa được ban hành văn bản trả lời công khai</strong> (hiện đang trong quá trình chuyển các cơ quan, đơn vị chuyên môn thẩm tra, xác minh và xử lý) để đôn đốc, đề nghị UBND xã và các ngành liên quan khẩn trương giải quyết theo thẩm quyền:
              </p>
            </div>
          )}

          {/* 2. SỐ LIỆU TỔNG QUAN TIẾP NHẬN VÀ GIẢI QUYẾT (CÓ THỂ CLICK ĐỂ CHỌN NHANH) */}
          <div className="avoid-break">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700"></span>
                I. Số liệu tổng quan về tình hình tiếp nhận và giải quyết
              </span>
              <span className="text-[11px] text-slate-400 font-normal no-print italic">
                (Nhấn vào từng ô để lọc và xem báo cáo tương ứng)
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
              {/* Thẻ 1: Tổng số */}
              <div
                onClick={() => setReportScope("ALL")}
                className={`p-3 rounded-xl text-center cursor-pointer transition border ${
                  reportScope === "ALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-700/50"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900"
                }`}
                title="Nhấn để xem toàn bộ hồ sơ trong kỳ"
              >
                <p className={`text-[11px] font-bold uppercase ${reportScope === "ALL" ? "text-slate-300" : "text-slate-500"}`}>
                  Tổng số tiếp nhận
                </p>
                <p className={`text-2xl font-black mt-0.5 ${reportScope === "ALL" ? "text-white" : "text-slate-900"}`}>
                  {stats.total}
                </p>
                <p className={`text-[10px] ${reportScope === "ALL" ? "text-slate-300" : "text-slate-400"}`}>
                  100% hồ sơ trong kỳ
                </p>
              </div>

              {/* Thẻ 2: Đã trả lời */}
              <div
                onClick={() => setReportScope("ANSWERED")}
                className={`p-3 rounded-xl text-center cursor-pointer transition border ${
                  reportScope === "ANSWERED"
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/50"
                    : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900"
                }`}
                title="Nhấn để xem các hồ sơ đã có câu trả lời"
              >
                <p className={`text-[11px] font-bold uppercase ${reportScope === "ANSWERED" ? "text-emerald-100" : "text-emerald-800"}`}>
                  Đã trả lời
                </p>
                <p className={`text-2xl font-black mt-0.5 ${reportScope === "ANSWERED" ? "text-white" : "text-emerald-700"}`}>
                  {stats.answered}
                </p>
                <p className={`text-[10px] font-bold ${reportScope === "ANSWERED" ? "text-emerald-200" : "text-emerald-600"}`}>
                  Đạt tỷ lệ {stats.resolutionRate}%
                </p>
              </div>

              {/* THẺ 3: CHƯA ĐƯỢC TRẢ LỜI CÔNG KHAI (MỤC ĐANG XÁC MINH XỬ LÝ) */}
              <div
                onClick={() => setReportScope("UNANSWERED")}
                className={`p-3 rounded-xl text-center cursor-pointer transition border relative overflow-hidden ${
                  reportScope === "UNANSWERED"
                    ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/50 font-extrabold"
                    : "bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-950"
                }`}
                title="Nhấn để xem chi tiết các hồ sơ cử tri chưa được trả lời công khai (đang xác minh, xử lý)"
              >
                <p className={`text-[11px] font-extrabold uppercase ${reportScope === "UNANSWERED" ? "text-amber-100" : "text-amber-900"}`}>
                  Chưa trả lời công khai
                </p>
                <p className={`text-2xl font-black mt-0.5 ${reportScope === "UNANSWERED" ? "text-white" : "text-amber-800"}`}>
                  {stats.unanswered}
                </p>
                <p className={`text-[10px] font-bold ${reportScope === "UNANSWERED" ? "text-amber-100" : "text-amber-700"}`}>
                  Chiếm {stats.unansweredRate}% hồ sơ
                </p>
                {reportScope !== "UNANSWERED" && (
                  <span className="absolute top-1 right-1 text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-full">
                    Xem mẫu MTTQ
                  </span>
                )}
              </div>

              {/* Thẻ 4: Đang xác minh hiện trường */}
              <div
                onClick={() => setReportScope("UNANSWERED")}
                className={`p-3 rounded-xl text-center cursor-pointer transition border ${
                  reportScope === "UNANSWERED"
                    ? "bg-blue-800 text-white border-blue-800"
                    : "bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900"
                }`}
                title="Các hồ sơ đang trong quá trình thẩm tra, xác minh hiện trường"
              >
                <p className={`text-[11px] font-bold uppercase ${reportScope === "UNANSWERED" ? "text-blue-100" : "text-blue-800"}`}>
                  Đang xác minh, xử lý
                </p>
                <p className={`text-2xl font-black mt-0.5 ${reportScope === "UNANSWERED" ? "text-white" : "text-blue-700"}`}>
                  {stats.processing > 0 ? stats.processing : stats.unanswered}
                </p>
                <p className={`text-[10px] ${reportScope === "UNANSWERED" ? "text-blue-200" : "text-blue-600"}`}>
                  Đang giao chuyên môn
                </p>
              </div>
            </div>
          </div>

          {/* 3. BẢNG TỔNG HỢP CƠ CẤU PHÂN THEO TỪNG MẢNG (LĨNH VỰC) */}
          <div className="avoid-break border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-700"></span>
              II. Cơ cấu số lượng ý kiến phân theo từng mảng lĩnh vực ({finalFeedbacks.length} hồ sơ)
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs border border-slate-200 bg-white rounded-lg">
                <thead className="bg-slate-100 text-slate-800 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-center w-12 border-r border-slate-200">STT</th>
                    <th className="px-3 py-2 text-left border-r border-slate-200">Mảng / Lĩnh vực phản ánh</th>
                    <th className="px-3 py-2 text-center w-28 border-r border-slate-200">Số lượng ý kiến</th>
                    <th className="px-3 py-2 text-center w-24 border-r border-slate-200">Tỷ lệ (%)</th>
                    <th className="px-3 py-2 text-left">Đơn vị chủ trì phối hợp xác minh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeCategorySummary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                        Không có ý kiến nào trong phạm vi và kỳ báo cáo đã chọn.
                      </td>
                    </tr>
                  ) : (
                    activeCategorySummary.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center font-bold text-slate-700 border-r border-slate-200">
                          {c.index}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">
                          {c.category}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-red-800 border-r border-slate-200">
                          {c.count}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-200">
                          {c.pct}%
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">
                          {c.answeringOrg}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. PHẦN BÁO CÁO ĐÁNH GIÁ MỨC ĐỘ HÀI LÒNG CỦA CỬ TRI (KHI XEM TỔNG HỢP HOẶC ĐÃ TRẢ LỜI) */}
          {reportScope !== "UNANSWERED" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs avoid-break">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                III. Kết quả đánh giá mức độ hài lòng của cử tri & nhân dân
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Ghi nhận qua cổng tra cứu trực tuyến đối với các ý kiến đã được thụ lý, trả lời chính thức:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="border border-emerald-300 bg-emerald-50/70 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900 uppercase">Rất hài lòng</p>
                    <p className="text-lg font-black text-emerald-700">{stats.ratingVery} lượt</p>
                    <p className="text-[10px] font-semibold text-emerald-700">Chiếm {stats.pctVery}%</p>
                  </div>
                </div>

                <div className="border border-amber-300 bg-amber-50/70 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                    <ThumbsUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900 uppercase">Hài lòng</p>
                    <p className="text-lg font-black text-amber-700">{stats.ratingSat} lượt</p>
                    <p className="text-[10px] font-semibold text-amber-700">Chiếm {stats.pctSat}%</p>
                  </div>
                </div>

                <div className="border border-red-300 bg-red-50/70 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-900 uppercase">Chưa hài lòng</p>
                    <p className="text-lg font-black text-red-700">{stats.ratingUnsat} lượt</p>
                    <p className="text-[10px] font-semibold text-red-700">Chiếm {stats.pctUnsat}%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-slate-700">
                  Tỷ lệ cử tri hài lòng chung (Rất hài lòng + Hài lòng):
                </span>
                <span className="font-black text-emerald-700 text-sm">
                  {stats.overallSatisfaction}% ({stats.ratingVery + stats.ratingSat} / {stats.totalRatings} lượt đánh giá)
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. BÁO CÁO CHI TIẾT NỘI DUNG Ý KIẾN ĐƯỢC PHÂN THEO TỪNG MẢNG */}
          {/*    (ĐÁP ỨNG CHÍNH XÁC YÊU CẦU CỦA NGƯỜI DÙNG: CÓ TÊN MẢNG, */}
          {/*    NỘI DUNG CHI TIẾT Ý KIẾN, TÊN NGƯỜI Ý KIẾN, TÊN THÔN BUÔN...) */}
          {/* ============================================================== */}
          <div className="space-y-6">
            <div className="border-b border-slate-300 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-700"></span>
                {reportScope === "UNANSWERED" ? "III." : "IV."} BÁO CÁO CHI TIẾT NỘI DUNG Ý KIẾN CỬ TRI PHÂN THEO TỪNG MẢNG LĨNH VỰC ({finalFeedbacks.length} Ý KIẾN)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {reportScope === "UNANSWERED"
                  ? "Danh sách chi tiết các ý kiến chưa có văn bản trả lời công khai, phân nhóm theo từng mảng công tác phục vụ xác minh giải quyết:"
                  : "Danh sách chi tiết các ý kiến cử tri, phân nhóm theo từng mảng lĩnh vực:"}
              </p>
            </div>

            {groupedFeedbacksByCategory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                Không tìm thấy ý kiến cử tri nào phù hợp với bộ lọc đã chọn.
              </div>
            ) : (
              groupedFeedbacksByCategory.map(([categoryName, itemsInCategory], mIdx) => (
                <div
                  key={categoryName}
                  className="space-y-2 border border-slate-300 rounded-xl p-3.5 bg-white avoid-break shadow-2xs"
                >
                  {/* TIÊU ĐỀ PHÂN MẢNG */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 bg-slate-50 -mx-3.5 -mt-3.5 p-3 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-800 text-white font-black text-xs">
                        MẢNG {toRoman(mIdx + 1)}
                      </span>
                      <h4 className="font-bold text-xs uppercase text-slate-900 tracking-tight">
                        {categoryName}
                      </h4>
                    </div>
                    <div className="text-[11px] font-bold text-slate-600">
                      Tổng số: <span className="text-red-800 font-black">{itemsInCategory.length}</span> ý kiến cử tri
                    </div>
                  </div>

                  {/* BẢNG CHI TIẾT TRONG MẢNG */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs border border-slate-200">
                      <thead className="bg-slate-100 text-slate-800 font-bold">
                        <tr>
                          <th className="px-2 py-2 text-center w-9 border-r border-slate-200">STT</th>
                          <th className="px-3 py-2 text-left w-40 border-r border-slate-200">
                            Người ý kiến & Thôn/Buôn
                          </th>
                          <th className="px-3 py-2 text-left border-r border-slate-200">
                            Nội dung chi tiết của ý kiến cử tri
                          </th>
                          <th className="px-2 py-2 text-center w-20 border-r border-slate-200">
                            Ngày nhận
                          </th>
                          <th className="px-3 py-2 text-left w-36 border-r border-slate-200">
                            Mảng phụ trách
                          </th>
                          <th className="px-3 py-2 text-left w-52">
                            Trùng lắp ý kiến
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {itemsInCategory.map((item, idx) => {
                          const isAnswered = hasOfficialAnswer(item);
                          const org = item.officialResponse?.answeringOrg || getDefaultAnsweringOrg(item.category);
                          const dupMatch = findDuplicateMatch(item, allFeedbacks);

                          // Yêu cầu 1: Không được tự bịa ra câu trả lời (các trường hợp trong báo cáo chưa trả lời đều chưa có văn bản trả lời)
                          const showAnswer = reportScope !== "UNANSWERED" && isAnswered && Boolean(item.officialResponse?.responseContent);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80">
                              {/* STT */}
                              <td className="px-2 py-2.5 text-center font-bold text-slate-600 border-r border-slate-200 align-top">
                                {idx + 1}
                              </td>

                              {/* TÊN NGƯỜI Ý KIẾN & TÊN THÔN BUÔN */}
                              <td className="px-3 py-2.5 border-r border-slate-200 align-top">
                                <p className="font-bold text-slate-900 text-xs">
                                  {item.voterName || "Cử tri Ea Súp"}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                  Đ/c: <span className="text-red-900 font-bold">{item.village}</span>
                                </p>
                                {item.phone && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    SĐT: {item.phone}
                                  </p>
                                )}
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  Mã: {item.ticketCode}
                                </p>
                              </td>

                              {/* NỘI DUNG CHI TIẾT CỦA Ý KIẾN (HIỂN THỊ ĐẦY ĐỦ, RÕ RÀNG) */}
                              <td className="px-3 py-2.5 border-r border-slate-200 text-slate-800 leading-relaxed text-justify align-top">
                                <div className="whitespace-pre-line text-xs font-medium">
                                  {item.content}
                                </div>
                                {showAnswer && item.officialResponse?.responseContent && (
                                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-900">
                                    <p className="font-bold text-emerald-800">
                                      ✓ Kết quả trả lời của {item.officialResponse.answeringOrg}:
                                    </p>
                                    <p className="mt-0.5">{item.officialResponse.responseContent}</p>
                                  </div>
                                )}
                              </td>

                              {/* NGÀY TIẾP NHẬN */}
                              <td className="px-2 py-2.5 text-center text-slate-600 text-[11px] border-r border-slate-200 align-top whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                              </td>

                              {/* MẢNG PHỤ TRÁCH (KHÔNG ĐƯA TÌNH TRẠNG XÁC MINH VÀO) */}
                              <td className="px-3 py-2.5 align-top text-xs border-r border-slate-200">
                                <p className="text-[11px] text-slate-800 font-semibold leading-snug">
                                  {org}
                                </p>
                              </td>

                              {/* TRÙNG LẮP Ý KIẾN */}
                              <td className="px-3 py-2.5 align-top text-xs">
                                {dupMatch ? (
                                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-950 space-y-1">
                                    <div className="font-bold text-rose-800 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>Trùng với ý kiến của cử tri:</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-rose-900">{dupMatch.voterName || "Cử tri"}</span>
                                      <span className="text-slate-600"> ({dupMatch.village})</span>
                                      <span className="text-rose-700 font-mono text-[10px] ml-1">[{dupMatch.ticketCode}]</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700">Đơn vị: </span>
                                      <span className="text-slate-800">
                                        {dupMatch.officialResponse?.answeringOrg || getDefaultAnsweringOrg(dupMatch.category)}
                                      </span>
                                    </div>
                                    <div className="text-slate-700 leading-relaxed border-t border-rose-200/60 pt-1 mt-1">
                                      <span className="font-semibold text-slate-800">Nội dung: </span>
                                      <span className="italic">
                                        "{dupMatch.content.length > 180 ? dupMatch.content.slice(0, 180) + "..." : dupMatch.content}"
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-slate-400 py-1 text-xs italic">Không trùng</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* KIẾN NGHỊ VÀ ĐỀ XUẤT CỦA BAN THƯỜNG TRỰC UB MTTQ XÃ */}
          {reportScope === "UNANSWERED" && (
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2 text-xs avoid-break">
              <h4 className="font-bold uppercase text-slate-900 tracking-wider">
                IV. Kiến nghị đôn đốc của Ban Thường trực Ủy ban MTTQ Việt Nam xã:
              </h4>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-800 text-justify leading-relaxed">
                <li>
                  Đề nghị Ủy ban nhân dân xã Ea Súp chỉ đạo các cơ quan chuyên môn (Ban Địa chính - Nông nghiệp - Xây dựng & Môi trường; Công an xã; Bộ phận Một cửa...) khẩn trương tiến hành kiểm tra thực tế, xác minh nội dung phản ánh của cử tri thuộc các mảng lĩnh vực nêu trên; đồng thời ban hành văn bản trả lời chính thức đúng thời hạn quy định để công khai cho cử tri được biết.
                </li>
                <li>
                  Đối với các vụ việc phức tạp, cần thời gian đo đạc, thẩm định nguồn gốc hoặc vượt thẩm quyền giải quyết của cấp xã, đề nghị UBND xã kịp thời có văn bản xin ý kiến chỉ đạo của UBND huyện Ea Súp và có thông báo tiến độ để cử tri an tâm.
                </li>
                <li>
                  Ban Thường trực Ủy ban MTTQ Việt Nam xã sẽ tiếp tục phân công cán bộ phối hợp kiểm tra, giám sát tiến độ giải quyết để thông báo công khai trước cử tri và Nhân dân tại kỳ họp HĐND và các hội nghị tiếp xúc cử tri sắp tới.
                </li>
              </ol>
            </div>
          )}

          {/* CHỮ KÝ PHÊ DUYỆT BÁO CÁO THEO MẪU THỂ THỨC CỦA MTTQ XÃ EA SÚP */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs avoid-break">
            <div>
              <p className="font-bold uppercase text-slate-800 text-[11px]">Nơi nhận:</p>
              <ul className="text-[10px] text-slate-600 mt-1 space-y-0.5 italic">
                <li>- Thường trực Đảng ủy xã (để báo cáo);</li>
                <li>- Thường trực HĐND xã (để phối hợp giám sát);</li>
                <li>- UBND xã Ea Súp (để chỉ đạo xác minh, xử lý);</li>
                <li>- Ban TT UBMTTQVN huyện Ea Súp (để b/c);</li>
                <li>- Ban Công tác Mặt trận 20 thôn, buôn;</li>
                <li>- Lưu: VT, Ban TT MTTQ.</li>
              </ul>
              <div className="mt-6">
                <p className="font-bold uppercase text-slate-800">NGƯỜI LẬP BIỂU</p>
                <p className="text-[11px] text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</p>
              </div>
            </div>

            <div className="text-center">
              <p className="font-bold uppercase text-slate-800">
                TM. BAN THƯỜNG TRỰC UB MTTQ VIỆT NAM XÃ EA SÚP
              </p>
              <p className="font-bold uppercase text-slate-900 mt-0.5">
                CHỦ TỊCH / PHÓ CHỦ TỊCH
              </p>
              <p className="text-[11px] text-slate-500 italic mb-16">(Ký tên, đóng dấu)</p>
            </div>
          </div>
        </div>

        {/* NÚT HÀNH ĐỘNG CUỐI MODAL (no-print) */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print flex-shrink-0">
          <div className="text-xs text-slate-600">
            {loadingAll ? (
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đồng bộ CSDL hệ thống...
              </span>
            ) : (
              <span>
                Tổng số <strong>{finalFeedbacks.length}</strong> hồ sơ hợp lệ đang hiển thị trong báo cáo.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer transition"
            >
              Đóng
            </button>

            {/* Nút In A4 chuẩn thể thức MTTQ Ea Súp */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              title="In bản báo cáo hành chính chuẩn thể thức MTTQ Ea Súp trên khổ A4"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              In báo cáo A4
            </button>

            {/* Nút Xuất file Word theo đúng thể thức Thông tư 30 / Nghị định 30 của Chính phủ */}
            <button
              type="button"
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              title="Tải văn bản Word (.doc) đúng thể thức Thông tư 30 / Nghị định 30/2020/NĐ-CP của Chính phủ"
            >
              <FileText className="w-4 h-4 text-sky-200" />
              Xuất file Word (.doc)
            </button>

            {/* Nút Xuất file Excel báo cáo nhiều sheet phân theo từng mảng */}
            <button
              type="button"
              onClick={handleExportReportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              title="Tải file Excel báo cáo thống kê đầy đủ (gồm sheet Tổng hợp theo mảng & Sheet Chi tiết theo từng mảng)"
            >
              <Download className="w-4 h-4 text-white" />
              Xuất file Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
