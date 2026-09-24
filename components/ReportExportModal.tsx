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

type PeriodType = "ALL" | "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR" | "CUSTOM";

export default function ReportExportModal({
  isOpen,
  onClose,
  feedbacks: initialFeedbacks,
}: ReportExportModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Giai đoạn lọc
  const [periodType, setPeriodType] = useState<PeriodType>("MONTH");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedHalfYear, setSelectedHalfYear] = useState<number>(currentMonth <= 6 ? 1 : 2);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

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

  // Lọc danh sách theo giai đoạn, thôn/buôn và lĩnh vực
  const filteredFeedbacks = useMemo(() => {
    return allFeedbacks.filter((item) => {
      const itemDate = new Date(item.createdAt);

      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;

      if (selectedVillage !== "Tất cả" && item.village !== selectedVillage) return false;
      if (selectedCategory !== "Tất cả" && item.category !== selectedCategory) return false;

      return true;
    });
  }, [allFeedbacks, startDate, endDate, selectedVillage, selectedCategory]);

  // Tính toán số liệu thống kê
  const stats = useMemo(() => {
    const total = filteredFeedbacks.length;
    const answered = filteredFeedbacks.filter((f) => f.status === "Đã trả lời").length;
    const processing = filteredFeedbacks.filter((f) => f.status === "Đang xử lý").length;
    const received = filteredFeedbacks.filter((f) => f.status === "Đã tiếp nhận").length;

    const resolutionRate = total > 0 ? ((answered / total) * 100).toFixed(1) : "100.0";

    // Số lượt đánh giá
    const ratingVery = filteredFeedbacks.reduce((sum, f) => sum + (f.ratingVerySatisfied || 0), 0);
    const ratingSat = filteredFeedbacks.reduce((sum, f) => sum + (f.ratingSatisfied || 0), 0);
    const ratingUnsat = filteredFeedbacks.reduce((sum, f) => sum + (f.ratingUnsatisfied || 0), 0);
    const totalRatings = ratingVery + ratingSat + ratingUnsat;

    const pctVery = totalRatings > 0 ? ((ratingVery / totalRatings) * 100).toFixed(1) : "0.0";
    const pctSat = totalRatings > 0 ? ((ratingSat / totalRatings) * 100).toFixed(1) : "0.0";
    const pctUnsat = totalRatings > 0 ? ((ratingUnsat / totalRatings) * 100).toFixed(1) : "0.0";
    const overallSatisfaction =
      totalRatings > 0
        ? (((ratingVery + ratingSat) / totalRatings) * 100).toFixed(1)
        : "100.0";

    // Thống kê theo Lĩnh vực
    const categoryStats = CATEGORIES.map((cat) => {
      const count = filteredFeedbacks.filter((f) => f.category === cat).length;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      return { category: cat, count, pct };
    }).sort((a, b) => b.count - a.count);

    // Thống kê theo Thôn/Buôn
    const villageStats = VILLAGES.map((vil) => {
      const count = filteredFeedbacks.filter((f) => f.village === vil).length;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      return { village: vil, count, pct };
    }).sort((a, b) => b.count - a.count);

    return {
      total,
      answered,
      processing,
      received,
      resolutionRate,
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
  }, [filteredFeedbacks]);

  // XUẤT FILE EXCEL BÁO CÁO TOÀN DIỆN (2 SHEET: TỔNG HỢP & CHI TIẾT)
  const handleExportReportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. SHEET 1: BÁO CÁO TỔNG HỢP & THỐNG KÊ
    const summaryRows = [
      ["ỦY BAN MẶT TRẬN TỔ QUỐC VIỆT NAM XÃ EA SÚP", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
      ["Ban Thường trực", "", "Độc lập - Tự do - Hạnh phúc"],
      ["", "", ""],
      ["BÁO CÁO THỐNG KÊ KẾT QUẢ TIẾP NHẬN, GIẢI QUYẾT VÀ ĐÁNH GIÁ Ý KIẾN CỬ TRI", "", ""],
      [`Kỳ báo cáo: ${periodLabel}`, "", ""],
      [`Thời điểm xuất báo cáo: ${new Date().toLocaleString("vi-VN")}`, "", ""],
      ["", "", ""],
      ["I. TỔNG HỢP SỐ LIỆU TIẾP NHẬN VÀ GIẢI QUYẾT", "", ""],
      ["Chỉ tiêu", "Số lượng (Hồ sơ)", "Tỷ lệ (%)"],
      ["Tổng số ý kiến tiếp nhận", stats.total, "100%"],
      ["Đã ban hành văn bản trả lời", stats.answered, `${stats.resolutionRate}%`],
      ["Đang thụ lý, thẩm tra xử lý", stats.processing, `${stats.total > 0 ? ((stats.processing / stats.total) * 100).toFixed(1) : "0"}%`],
      ["Chờ tiếp nhận phân loại", stats.received, `${stats.total > 0 ? ((stats.received / stats.total) * 100).toFixed(1) : "0"}%`],
      ["", "", ""],
      ["II. KẾT QUẢ ĐÁNH GIÁ MỨC ĐỘ HÀI LÒNG CỦA CỬ TRI", "", ""],
      ["Mức độ đánh giá", "Số lượt cử tri đánh giá", "Tỷ lệ phần trăm"],
      ["Rất hài lòng ⭐", stats.ratingVery, `${stats.pctVery}%`],
      ["Hài lòng 👍", stats.ratingSat, `${stats.pctSat}%`],
      ["Chưa hài lòng ⚠️", stats.ratingUnsat, `${stats.pctUnsat}%`],
      ["Tổng số lượt đánh giá ghi nhận", stats.totalRatings, "100%"],
      ["Tỷ lệ cử tri đánh giá Hài lòng & Rất hài lòng", "", `${stats.overallSatisfaction}%`],
      ["", "", ""],
      ["III. CƠ CẤU THEO LĨNH VỰC PHẢN ÁNH", "", ""],
      ["STT", "Lĩnh vực phản ánh", "Số lượng ý kiến", "Tỷ lệ (%)"],
      ...stats.categoryStats.map((c, idx) => [idx + 1, c.category, c.count, `${c.pct}%`]),
      ["", "", ""],
      ["IV. CƠ CẤU THEO ĐỊA BÀN THÔN, BUÔN", "", ""],
      ["STT", "Địa bàn Thôn / Buôn", "Số lượng ý kiến", "Tỷ lệ (%)"],
      ...stats.villageStats.map((v, idx) => [idx + 1, v.village, v.count, `${v.pct}%`]),
      ["", "", ""],
      ["", "Người lập biểu", "TM. BAN THƯỜNG TRỰC UB MTTQ XÃ EA SÚP"],
      ["", "(Ký, ghi rõ họ tên)", "(Ký tên, đóng dấu)"],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "BaoCao_ThongKe");

    // 2. SHEET 2: DANH SÁCH CHI TIẾT ĐỒNG BỘ 100% TIÊU CHUẨN CSDL & FILE NHẬP
    const detailHeaders = [
      "STT",
      "Mã hồ sơ",
      "Họ và tên",
      "Số điện thoại",
      "Thôn/Buôn",
      "Lĩnh vực",
      "Nội dung ý kiến",
      "Trạng thái",
      "Ngày tiếp nhận",
      "Cơ quan trả lời",
      "Nội dung trả lời",
      "Ngày trả lời",
      "Người ký",
      "Văn bản đính kèm",
      "Rất hài lòng",
      "Hài lòng",
      "Chưa hài lòng",
    ];

    const detailRows = filteredFeedbacks.map((item, idx) => [
      idx + 1,
      item.ticketCode,
      item.voterName,
      item.phone || "",
      item.village,
      item.category,
      item.content,
      item.status,
      new Date(item.createdAt).toLocaleDateString("vi-VN"),
      item.officialResponse?.answeringOrg || "",
      item.officialResponse?.responseContent || "",
      item.officialResponse?.answeredAt
        ? new Date(item.officialResponse.answeredAt).toLocaleDateString("vi-VN")
        : "",
      item.officialResponse?.answeredBy || "",
      item.officialResponse?.documentUrl || "",
      item.ratingVerySatisfied || 0,
      item.ratingSatisfied || 0,
      item.ratingUnsatisfied || 0,
    ]);

    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    wsDetail["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 32 },
      { wch: 45 },
      { wch: 15 },
      { wch: 14 },
      { wch: 30 },
      { wch: 45 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "DanhSach_ChiTiet");

    // Xuất file Excel bảo đảm đuôi .xlsx trên mọi trình duyệt
    const safePeriodName = periodLabel.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
    const filename = `Bao_cao_y_kien_cu_tri_Xa_Ea_Sup_${safePeriodName}.xlsx`;

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

  // IN BÁO CÁO A4 HÀNH CHÍNH
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* HEADER MODAL (no-print) */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white flex items-center justify-between no-print flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight">
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO & THÔNG SỐ (no-print) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 no-print space-y-4 flex-shrink-0">
          {/* Hàng 1: Loại giai đoạn */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-700" />
              Kỳ báo cáo:
            </span>

            {[
              { id: "MONTH", label: "Theo Tháng" },
              { id: "QUARTER", label: "Theo Quý" },
              { id: "HALF_YEAR", label: "Theo 6 Tháng" },
              { id: "YEAR", label: "Theo Năm" },
              { id: "CUSTOM", label: "Tùy chọn giai đoạn" },
              { id: "ALL", label: "Tất cả thời gian" },
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

          {/* Hàng 2: Bộ chọn chi tiết theo loại kỳ */}
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

          {/* Thanh hiển thị kỳ đã chọn */}
          <div className="flex flex-wrap items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-600">
              Đang xem báo cáo: <strong className="text-red-800 font-bold">{periodLabel}</strong>{" "}
              {selectedVillage !== "Tất cả" && ` | Địa bàn: ${selectedVillage}`}{" "}
              {selectedCategory !== "Tất cả" && ` | Lĩnh vực: ${selectedCategory}`}
            </span>
            <span className="text-slate-500 font-medium">
              Tìm thấy <strong className="text-slate-900">{filteredFeedbacks.length}</strong> hồ sơ ý kiến cử tri
            </span>
          </div>
        </div>

        {/* NỘI DUNG XEM TRƯỚC BÁO CÁO & BẢN IN A4 CHUẨN CÔNG VỤ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 printable-report">
          {/* 1. TIÊU ĐỀ VĂN BẢN CHUẨN HÀNH CHÍNH (Hiện rõ cả khi in A4) */}
          <div className="border-b-2 border-slate-800 pb-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs uppercase font-bold text-slate-800">
                  ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
                </p>
                <p className="text-xs text-slate-600 font-medium">Số: ..... /BC-MTTQ</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-800">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </p>
                <p className="text-xs text-slate-700 font-bold border-b border-slate-800 inline-block pb-0.5">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <p className="text-[11px] text-slate-500 italic mt-1">
                  Ea Súp, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
              </div>
            </div>

            <div className="text-center mt-5">
              <h1 className="text-base sm:text-xl font-black uppercase text-slate-900 tracking-tight">
                BÁO CÁO TỔNG HỢP KẾT QUẢ TIẾP NHẬN, GIẢI QUYẾT VÀ ĐÁNH GIÁ Ý KIẾN CỬ TRI
              </h1>
              <p className="text-xs font-bold text-red-800 uppercase mt-1">
                KỲ BÁO CÁO: {periodLabel}
              </p>
            </div>
          </div>

          {/* 2. SỐ LIỆU TỔNG QUAN TIẾP NHẬN VÀ GIẢI QUYẾT */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-700"></span>
              I. Số liệu tổng quan về tình hình tiếp nhận và giải quyết
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Tổng số tiếp nhận</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</p>
                <p className="text-[10px] text-slate-400">100% hồ sơ trong kỳ</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                <p className="text-[11px] font-bold text-emerald-800 uppercase">Đã trả lời</p>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.answered}</p>
                <p className="text-[10px] text-emerald-600 font-bold">Đạt tỷ lệ {stats.resolutionRate}%</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                <p className="text-[11px] font-bold text-amber-800 uppercase">Đang xử lý</p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">{stats.processing}</p>
                <p className="text-[10px] text-amber-600">
                  {stats.total > 0 ? ((stats.processing / stats.total) * 100).toFixed(1) : 0}% hồ sơ
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                <p className="text-[11px] font-bold text-blue-800 uppercase">Chờ tiếp nhận</p>
                <p className="text-2xl font-black text-blue-700 mt-0.5">{stats.received}</p>
                <p className="text-[10px] text-blue-600">
                  {stats.total > 0 ? ((stats.received / stats.total) * 100).toFixed(1) : 0}% hồ sơ
                </p>
              </div>
            </div>
          </div>

          {/* 3. THỐNG KÊ ĐÁNH GIÁ MỨC ĐỘ HÀI LÒNG CỦA CỬ TRI (ĐÁP ỨNG YÊU CẦU NGƯỜI DÙNG) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              II. Kết quả đánh giá mức độ hài lòng của cử tri & nhân dân
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Ghi nhận qua cổng tra cứu trực tuyến đối với các ý kiến đã được thụ lý, trả lời chính thức:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Rất hài lòng */}
              <div className="border border-emerald-300 bg-emerald-50/70 p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase">Rất hài lòng</p>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">
                    {stats.ratingVery} <span className="text-xs font-normal text-emerald-800">lượt</span>
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700">Chiếm {stats.pctVery}%</p>
                </div>
              </div>

              {/* Hài lòng */}
              <div className="border border-amber-300 bg-amber-50/70 p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase">Hài lòng</p>
                  <p className="text-xl font-black text-amber-700 mt-0.5">
                    {stats.ratingSat} <span className="text-xs font-normal text-amber-800">lượt</span>
                  </p>
                  <p className="text-[11px] font-semibold text-amber-700">Chiếm {stats.pctSat}%</p>
                </div>
              </div>

              {/* Chưa hài lòng */}
              <div className="border border-red-300 bg-red-50/70 p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-900 uppercase">Chưa hài lòng</p>
                  <p className="text-xl font-black text-red-700 mt-0.5">
                    {stats.ratingUnsat} <span className="text-xs font-normal text-red-800">lượt</span>
                  </p>
                  <p className="text-[11px] font-semibold text-red-700">Chiếm {stats.pctUnsat}%</p>
                </div>
              </div>
            </div>

            {/* Thanh tiến trình phân đoạn trực quan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Tỷ lệ cử tri hài lòng chung (Rất hài lòng + Hài lòng):
                </span>
                <span className="font-black text-emerald-700 text-sm">
                  {stats.overallSatisfaction}% ({stats.ratingVery + stats.ratingSat} / {stats.totalRatings} lượt)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${stats.pctVery}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`Rất hài lòng: ${stats.pctVery}%`}
                />
                <div
                  style={{ width: `${stats.pctSat}%` }}
                  className="bg-amber-400 transition-all duration-300"
                  title={`Hài lòng: ${stats.pctSat}%`}
                />
                <div
                  style={{ width: `${stats.pctUnsat}%` }}
                  className="bg-red-500 transition-all duration-300"
                  title={`Chưa hài lòng: ${stats.pctUnsat}%`}
                />
              </div>
            </div>
          </div>

          {/* 4. CƠ CẤU THEO LĨNH VỰC & THÔN BUÔN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lĩnh vực */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
                III. Phân bố theo 7 lĩnh vực phản ánh
              </h4>
              <div className="space-y-1.5 text-xs">
                {stats.categoryStats.map((c, idx) => (
                  <div key={c.category} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="truncate pr-2 font-medium text-slate-700">
                      {idx + 1}. {c.category}
                    </span>
                    <span className="font-bold text-slate-900 flex-shrink-0">
                      {c.count} ({c.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Thôn Buôn */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
                IV. Phân bố theo địa bàn 20 Thôn, Buôn
              </h4>
              <div className="space-y-1.5 text-xs max-h-64 overflow-y-auto pr-1">
                {stats.villageStats.map((v, idx) => (
                  <div key={v.village} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">
                      {idx + 1}. {v.village}
                    </span>
                    <span className="font-bold text-slate-900 flex-shrink-0">
                      {v.count} ({v.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. DANH SÁCH CHI TIẾT CÁC Ý KIẾN TRONG KỲ (BẢNG RÚT GỌN TRÊN BẢN IN) */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
              V. Danh sách chi tiết các hồ sơ ý kiến cử tri trong kỳ ({filteredFeedbacks.length} hồ sơ)
            </h4>

            <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="px-2.5 py-2 text-left w-10">STT</th>
                    <th className="px-2.5 py-2 text-left">Mã hồ sơ</th>
                    <th className="px-2.5 py-2 text-left">Cử tri</th>
                    <th className="px-2.5 py-2 text-left">Địa bàn</th>
                    <th className="px-2.5 py-2 text-left">Nội dung ý kiến tóm tắt</th>
                    <th className="px-2.5 py-2 text-left">Trạng thái</th>
                    <th className="px-2.5 py-2 text-left">Cơ quan trả lời</th>
                    <th className="px-2.5 py-2 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Không có hồ sơ nào trong kỳ báo cáo đã chọn.
                      </td>
                    </tr>
                  ) : (
                    filteredFeedbacks.map((f, idx) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-2.5 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-2.5 py-2 font-mono font-bold text-red-800 text-[11px]">
                          {f.ticketCode}
                        </td>
                        <td className="px-2.5 py-2 font-semibold text-slate-900">{f.voterName}</td>
                        <td className="px-2.5 py-2 text-slate-600">{f.village}</td>
                        <td className="px-2.5 py-2 text-slate-700 max-w-xs truncate" title={f.content}>
                          {f.content}
                        </td>
                        <td className="px-2.5 py-2">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              f.status === "Đã trả lời"
                                ? "bg-emerald-100 text-emerald-800"
                                : f.status === "Đang xử lý"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-slate-600 text-[11px]">
                          {f.officialResponse?.answeringOrg || "-"}
                        </td>
                        <td className="px-2.5 py-2 text-center text-[10px]">
                          <span className="text-emerald-600 font-bold" title="Rất hài lòng">
                            {f.ratingVerySatisfied || 0}
                          </span>
                          {" / "}
                          <span className="text-amber-600 font-bold" title="Hài lòng">
                            {f.ratingSatisfied || 0}
                          </span>
                          {" / "}
                          <span className="text-red-600 font-bold" title="Chưa hài lòng">
                            {f.ratingUnsatisfied || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHỮ KÝ PHÊ DUYỆT BÁO CÁO (HIỂN THỊ KHI IN A4) */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-slate-800">NGƯỜI LẬP BIỂU</p>
              <p className="text-[11px] text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-800">
                TM. BAN THƯỜNG TRỰC UB MTTQ VIỆT NAM XÃ EA SÚP
              </p>
              <p className="text-[11px] text-slate-500 italic mb-14">(Chủ tịch / Phó Chủ tịch ký tên, đóng dấu)</p>
            </div>
          </div>
        </div>

        {/* NÚT HÀNH ĐỘNG CUỐI MODAL (no-print) */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print flex-shrink-0">
          <div className="text-xs text-slate-500">
            {loadingAll ? (
              <span className="flex items-center gap-1.5 text-amber-700">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đồng bộ CSDL...
              </span>
            ) : (
              <span>
                Tổng số <strong>{filteredFeedbacks.length}</strong> hồ sơ hợp lệ trong kỳ.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer"
            >
              Đóng
            </button>

            {/* Nút In A4 chuẩn công vụ */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
              title="In bản báo cáo hành chính chuẩn A4"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              In báo cáo A4
            </button>

            {/* Nút Xuất file Excel báo cáo nhiều sheet */}
            <button
              type="button"
              onClick={handleExportReportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
              title="Tải file Excel báo cáo thống kê đầy đủ 2 Sheet"
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
