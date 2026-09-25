"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Filter,
  Send,
  CheckCircle2,
  Clock,
  Inbox,
  Award,
  ExternalLink,
  Phone,
  MapPin,
  FileText,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  X,
  AlertCircle,
  HelpCircle,
  Building2,
  Calendar,
  Eye,
  User,
  Paperclip,
  Upload,
  Trash2,
  ChevronDown,
  LogOut,
  Edit,
} from "lucide-react";
import { VILLAGES, CATEGORIES, STATUS_LIST } from "@/lib/constants";
import { signOut } from "next-auth/react";
import AuthModal from "@/components/AuthModal";
import VoterProfileModal from "@/components/VoterProfileModal";
import ChatbotWidget from "@/components/ChatbotWidget";

interface OfficialResponseType {
  id: number;
  answeringOrg: string;
  responseContent: string;
  documentUrl?: string | null;
  answeredAt: string;
  answeredBy: string;
}

export interface AttachmentItem {
  name: string;
  url: string;
  size: number;
  type: string;
  ext?: string;
}

interface FeedbackItem {
  id: number;
  ticketCode: string;
  voterName: string;
  phone?: string | null;
  village: string;
  category: string;
  content: string;
  status: string;
  isApproved?: boolean;
  createdAt: string;
  ratingVerySatisfied?: number;
  ratingSatisfied?: number;
  ratingUnsatisfied?: number;
  attachments?: AttachmentItem[] | null;
  officialResponse?: OfficialResponseType | null;
}

interface StatsData {
  total: number;
  answered: number;
  processing: number;
  received: number;
  pendingApproval?: number;
  resolutionRate: number;
}

export default function HomePage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    answered: 0,
    processing: 0,
    received: 0,
    pendingApproval: 0,
    resolutionRate: 100,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedStatus, setSelectedStatus] = useState("Tất cả");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cử tri đăng nhập State
  const [currentVoter, setCurrentVoter] = useState<{
    id?: string;
    fullName: string;
    email?: string;
    image?: string;
    phone: string;
    village: string;
    role?: string;
    isGoogle?: boolean;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Đóng dropdown menu khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState<FeedbackItem | null>(null);
  const [selectedResponseItem, setSelectedResponseItem] = useState<FeedbackItem | null>(null);

  // Ratings State (Lưu lựa chọn của cử tri đang xem)
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [ratingNotice, setRatingNotice] = useState<string | null>(null);

  useEffect(() => {
    // Kiểm tra phiên đăng nhập của Cử tri (Google OAuth hoặc SĐT)
    const checkVoter = async () => {
      try {
        const res = await fetch("/api/voter/me");
        const data = await res.json();
        if (data.isLoggedIn && data.voter) {
          setCurrentVoter(data.voter);
          if (data.ratings) {
            setRatings((prev) => ({ ...prev, ...data.ratings }));
          }
        }
      } catch {}
    };
    checkVoter();
  }, []);

  const handleVoterLogout = async () => {
    try {
      await fetch("/api/voter/logout", { method: "POST" });
      if (currentVoter?.isGoogle) {
        await signOut({ redirect: false });
      }
      setCurrentVoter(null);
      setRatingNotice("Đã đăng xuất tài khoản Cử tri");
      setTimeout(() => setRatingNotice(null), 3000);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRate = async (id: number, ratingValue: "Rất hài lòng" | "Hài lòng" | "Chưa hài lòng") => {
    if (!currentVoter) {
      setShowAuthModal(true);
      return;
    }

    const updated = { ...ratings, [id]: ratingValue };
    setRatings(updated);

    try {
      const res = await fetch("/api/voter/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: id, rating: ratingValue }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  ratingVerySatisfied: data.ratingVerySatisfied,
                  ratingSatisfied: data.ratingSatisfied,
                  ratingUnsatisfied: data.ratingUnsatisfied,
                }
              : it
          )
        );
        setRatingNotice(`Cử tri ${currentVoter.fullName} đã ghi nhận: "${ratingValue}"`);
        setTimeout(() => setRatingNotice(null), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    isAnonymous: boolean;
    voterName: string;
    phone: string;
    village: string;
    category: string;
    content: string;
  }>({
    isAnonymous: false,
    voterName: "",
    phone: "",
    village: VILLAGES[0],
    category: CATEGORIES[0],
    content: "",
  });

  // Tự động điền trước Họ tên, SĐT, Thôn/Buôn của Cử tri khi đã đăng nhập
  useEffect(() => {
    if (currentVoter) {
      setFormData((prev) => ({
        ...prev,
        voterName: prev.voterName || currentVoter.fullName || "",
        phone: prev.phone || currentVoter.phone || "",
        village: currentVoter.village || prev.village || VILLAGES[0],
      }));
    }
  }, [currentVoter, showSubmitModal]);

  // Attachment State (Tối đa 4 tệp, mỗi tệp < 5MB)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const MAX_FILES = 4;
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    if (attachedFiles.length + newFiles.length > MAX_FILES) {
      setFileError(`Chỉ được đính kèm tối đa ${MAX_FILES} tệp tin. Hiện tại đã có ${attachedFiles.length} tệp.`);
      e.target.value = "";
      return;
    }

    const validFiles: File[] = [];
    for (const f of newFiles) {
      if (f.size > MAX_SIZE_BYTES) {
        setFileError(`Tệp "${f.name}" vượt quá dung lượng 5MB (${(f.size / (1024 * 1024)).toFixed(1)}MB). Vui lòng chọn tệp dưới 5MB.`);
        e.target.value = "";
        return;
      }
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setFileError(`Tệp "${f.name}" không đúng định dạng. Chỉ chấp nhận Ảnh (JPG, PNG, WEBP), PDF hoặc Word (.doc, .docx).`);
        e.target.value = "";
        return;
      }
      validFiles.push(f);
    }

    setAttachedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
    setFileError(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "10");
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (selectedVillage !== "Tất cả") params.append("village", selectedVillage);
      if (selectedCategory !== "Tất cả") params.append("category", selectedCategory);
      if (selectedStatus !== "Tất cả") params.append("status", selectedStatus);

      const [resFeedbacks, resStats] = await Promise.all([
        fetch(`/api/feedback?${params.toString()}`),
        fetch("/api/stats"),
      ]);

      const dataFeedbacks = await resFeedbacks.json();
      const dataStats = await resStats.json();

      if (dataFeedbacks.success) {
        // Bảo vệ kép: Tại giao diện Trang chủ / Khách xem / Cử tri đăng nhập TUYỆT ĐỐI không hiển thị hồ sơ chưa duyệt
        const approvedOnly = (dataFeedbacks.items || []).filter(
          (item: FeedbackItem) => item.status !== "Chờ duyệt" && (item as any).isApproved !== false
        );
        setItems(approvedOnly);
        setTotalPages(dataFeedbacks.totalPages || 1);
      }
      if (dataStats.success) {
        setStats(dataStats.stats);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, selectedVillage, selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim() || formData.content.length < 10) {
      alert("Vui lòng nhập nội dung ý kiến phản ánh chi tiết (tối thiểu 10 ký tự)");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Tải lên tệp đính kèm nếu có
      let uploadedAttachments: AttachmentItem[] = [];
      if (attachedFiles.length > 0) {
        const uploadFormData = new FormData();
        attachedFiles.forEach((f) => uploadFormData.append("files", f));

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          alert(uploadData.message || "Lỗi khi tải tệp đính kèm lên máy chủ");
          setIsSubmitting(false);
          return;
        }
        uploadedAttachments = uploadData.files || [];
      }

      // 2. Gửi phản ánh kèm tệp đính kèm
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterName: formData.isAnonymous
            ? "Cử tri ẩn danh"
            : formData.voterName.trim() || "Cử tri ẩn danh",
          phone: formData.phone.trim(),
          village: formData.village,
          category: formData.category,
          content: formData.content.trim(),
          attachments: uploadedAttachments,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setFormSuccess(resData.data.ticketCode);
        setAttachedFiles([]);
        setFileError(null);
        setFormData({
          isAnonymous: false,
          voterName: "",
          phone: "",
          village: VILLAGES[0],
          category: CATEGORIES[0],
          content: "",
        });
        fetchData();
      } else {
        alert(resData.message || "Không thể gửi ý kiến. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi gửi. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã trả lời":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã trả lời
          </span>
        );
      case "Đang xử lý":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Đang thẩm tra, xử lý
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Inbox className="w-3.5 h-3.5 text-blue-600" />
            Mới tiếp nhận
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sky-50/40 text-slate-900">
      {/* 1. HEADER CHUẨN CÔNG VỤ / QUỐC GIA */}
      <header className="border-b border-sky-200 bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 text-slate-900 shadow-xs">

        {/* Banner chính */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white p-1 rounded-full shadow-xs border-2 border-sky-300">
              <Image
                src="/logo.png"
                alt="Logo Mặt trận Tổ quốc Xã Ea Súp"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-wider text-red-700 uppercase">
                ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
              </p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-blue-950 mt-0.5">
                TIẾNG NÓI CỬ TRI
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương
              </p>
            </div>
          </div>

          {/* Nút hành động trên Header */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-center">
            {/* 1. Gửi ý kiến mới - CHỈ XUẤT HIỆN KHI CỬ TRI ĐÃ ĐĂNG NHẬP (Chế độ khách xem KHÔNG HIỂN THỊ) */}
            {currentVoter && (
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(true);
                  setFormSuccess(null);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition duration-150 transform hover:-translate-y-0.5 cursor-pointer animate-in fade-in"
                title="Gửi ý kiến, kiến nghị của cử tri đến chính quyền xã"
              >
                <Send className="w-4 h-4" />
                <span>Gửi ý kiến mới</span>
              </button>
            )}

            {/* 2. Đăng nhập Cử tri / Cụm thông tin tài khoản Cử tri */}
            {currentVoter ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 p-1.5 sm:px-3 sm:py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                  title="Tài khoản cử tri"
                >
                  {currentVoter.image ? (
                    <img
                      src={currentVoter.image}
                      alt={currentVoter.fullName}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-emerald-500 shadow-2xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                      {(currentVoter.fullName || "CT").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left max-w-[140px]">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentVoter.fullName}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Cử tri</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>

                {/* Menu thả xuống của người dùng */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-150">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentVoter.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentVoter.email || currentVoter.phone || "Đã xác thực"}
                      </p>
                      {currentVoter.village ? (
                        <p className="text-[10px] text-red-700 font-medium mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                          <span>{currentVoter.village}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-700 italic mt-1">
                          Chưa cập nhật Thôn/Buôn
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowSubmitModal(true);
                        setFormSuccess(null);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50/80 hover:bg-amber-100 flex items-center gap-2.5 cursor-pointer transition border-b border-slate-100"
                    >
                      <Send className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>Gửi ý kiến phản ánh mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSearchTerm(currentVoter.fullName);
                        setPage(1);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-red-700 flex items-center gap-2.5 cursor-pointer transition"
                    >
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>Ý kiến đã gửi của tôi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-red-700 flex items-center gap-2.5 cursor-pointer transition"
                    >
                      <Edit className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>Cập nhật Thôn/Buôn/SĐT</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleVoterLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer transition"
                    >
                      <LogOut className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xs transition duration-150 transform hover:-translate-y-0.5 cursor-pointer border border-emerald-600"
              >
                <UserCheck className="w-4 h-4 text-emerald-100" />
                <span>Đăng nhập gửi ý kiến/đánh giá</span>
              </button>
            )}

            {/* 3. Đăng nhập Cán bộ - chỉ giữ lại biểu tượng nhỏ */}
            <Link
              href="/admin/login"
              title="Đăng nhập Cán bộ quản trị"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white hover:bg-sky-50 text-slate-600 hover:text-blue-800 border border-slate-300 hover:border-sky-300 shadow-xs transition duration-150 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-slate-700 hover:text-blue-700" />
              <span className="sr-only">Đăng nhập Cán bộ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. KHỐI THỐNG KÊ (METRICS) - ĐỒNG BỘ CHÍNH XÁC VỚI DANH SÁCH HỒ SƠ */}
      <section className="bg-white border-b border-slate-200 py-3 sm:py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Tổng số */}
            <div
              onClick={() => {
                setSelectedStatus("Tất cả");
                setPage(1);
              }}
              title="Bấm để xem tất cả hồ sơ ý kiến cử tri"
              className={`rounded-lg px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between border shadow-xs cursor-pointer transition ${
                selectedStatus === "Tất cả"
                  ? "bg-red-50/70 border-red-300 ring-2 ring-red-600/20"
                  : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
              }`}
            >
              <div>
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Tổng ý kiến tiếp nhận
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none mt-1">
                  {stats.total}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Hồ sơ phản ánh</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Card 2: Đợi duyệt (Thay thế cho Đã tiếp nhận) */}
            <div
              onClick={() => {
                setSelectedStatus("Đợi duyệt");
                setPage(1);
              }}
              title="Bấm để xem số hồ sơ ý kiến cử tri đợi duyệt"
              className={`rounded-lg px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between border shadow-xs cursor-pointer transition ${
                selectedStatus === "Đợi duyệt" || selectedStatus === "Chờ duyệt"
                  ? "bg-amber-100/70 border-amber-400 ring-2 ring-amber-600/20"
                  : "bg-amber-50/50 border-amber-200/80 hover:bg-amber-100/50"
              }`}
            >
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                  Đợi duyệt
                </p>
                <p className="text-xl sm:text-2xl font-black text-amber-700 leading-none mt-1">
                  {stats.pendingApproval ?? stats.received ?? 0}
                </p>
                <p className="text-[11px] text-amber-600 mt-1">Hồ sơ chờ phê duyệt</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Card 3: Đang xác minh, xử lý (Toàn bộ ý kiến đang xác minh, xử lý) */}
            <div
              onClick={() => {
                setSelectedStatus("Đang xác minh, xử lý");
                setPage(1);
              }}
              title="Bấm để lọc toàn bộ danh sách hồ sơ đang xác minh, xử lý"
              className={`rounded-lg px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between border shadow-xs cursor-pointer transition ${
                selectedStatus === "Đang xác minh, xử lý" || selectedStatus === "Đang xử lý"
                  ? "bg-blue-100/70 border-blue-400 ring-2 ring-blue-600/20"
                  : "bg-blue-50/50 border-blue-200/80 hover:bg-blue-100/50"
              }`}
            >
              <div>
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                  Đang xác minh, xử lý
                </p>
                <p className="text-xl sm:text-2xl font-black text-blue-700 leading-none mt-1">
                  {stats.processing}
                </p>
                <p className="text-[11px] text-blue-600 mt-1">Toàn bộ ý kiến đang thụ lý</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <Inbox className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Card 4: Đã trả lời công khai */}
            <div
              onClick={() => {
                setSelectedStatus("Đã trả lời");
                setPage(1);
              }}
              title="Bấm để lọc danh sách hồ sơ Đã trả lời công khai"
              className={`rounded-lg px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between border shadow-xs cursor-pointer transition ${
                selectedStatus === "Đã trả lời"
                  ? "bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-600/20"
                  : "bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-100/50"
              }`}
            >
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                  Đã trả lời công khai
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 leading-none mt-1">
                  {stats.answered}
                </p>
                <p className="text-[11px] text-emerald-600 mt-1">
                  Đạt {stats.resolutionRate}% hoàn thành
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KHỐI TRA CỨU & ĐÁNH GIÁ KẾT QUẢ GIẢI QUYẾT - GỌN GÀNG */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 sm:p-4.5 mb-5">
          <div className="pb-3 border-b border-slate-100 space-y-2.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Filter className="w-4 h-4 text-red-700" />
              TRA CỨU, ĐÁNH GIÁ KẾT QUẢ GIẢI QUYẾT
            </h2>

            {/* Trạng thái tab ngay phía dưới tiêu đề - Kèm số lượng hồ sơ đồng bộ */}
            <div>
              <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-lg">
                {STATUS_LIST.map((st) => {
                  const count =
                    st === "Tất cả"
                      ? stats.total
                      : st === "Đang xác minh, xử lý"
                      ? stats.processing
                      : st === "Đã trả lời"
                      ? stats.answered
                      : 0;

                  return (
                    <button
                      key={st}
                      onClick={() => {
                        setSelectedStatus(st);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        selectedStatus === st
                          ? "bg-white text-red-800 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>{st}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] leading-tight ${
                          selectedStatus === st
                            ? "bg-red-100 text-red-800 font-bold"
                            : "bg-slate-200/90 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Ô tìm kiếm theo tên hoặc mã hồ sơ */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Theo tên / Mã hồ sơ
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ví dụ: Họ tên, EASUP-PA-..., từ khóa..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none focus:bg-white"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>

            {/* Lọc Thôn / Buôn */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Địa bàn Thôn / Buôn
              </label>
              <select
                value={selectedVillage}
                onChange={(e) => {
                  setSelectedVillage(e.target.value);
                  setPage(1);
                }}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none focus:bg-white"
              >
                <option value="Tất cả">-- Tất cả 20 Thôn / Buôn --</option>
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
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none focus:bg-white"
              >
                <option value="Tất cả">-- Tất cả lĩnh vực --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút tìm kiếm */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                Tìm kiếm
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedVillage("Tất cả");
                  setSelectedCategory("Tất cả");
                  setSelectedStatus("Tất cả");
                  setPage(1);
                }}
                title="Làm mới bộ lọc"
                className="p-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition flex items-center justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* 4. BẢNG DANH SÁCH Ý KIẾN CỬ TRI & KẾT QUẢ TRẢ LỜI */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Danh sách ý kiến cử tri ({items.length} hồ sơ)
            </h3>
            <div className="flex items-center gap-3">
              {ratingNotice && (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-fade-in">
                  ✓ {ratingNotice}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                Trang {page} / {totalPages}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-8 h-8 text-red-700 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Đang tải dữ liệu hồ sơ cử tri...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Inbox className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">Không tìm thấy ý kiến cử tri nào</p>
              <p className="text-xs text-slate-500 mt-1">
                Hãy thử điều chỉnh từ khóa tìm kiếm hoặc làm mới bộ lọc
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/95 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2 text-center w-10 whitespace-nowrap">TT</th>
                      <th className="py-3 px-3 w-36">Họ tên cử tri</th>
                      <th className="py-3 px-3 w-32">Thôn / Buôn</th>
                      <th className="py-3 px-3 w-28">Ngày ý kiến</th>
                      <th className="py-3 px-3 text-center w-36">Nội dung ý kiến</th>
                      <th className="py-3 px-3 text-center w-40">Trả lời</th>
                      <th className="py-3 px-3 text-center min-w-[280px]">Đánh giá kết quả giải quyết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {items.map((item, index) => {
                      const stt = (page - 1) * 10 + index + 1;
                      const currentRating = ratings[item.id];
                      const isAnswered = item.status === "Đã trả lời";

                      const isAnonymous =
                        !item.voterName ||
                        !item.voterName.trim() ||
                        item.voterName.trim().toLowerCase() === "cử tri ẩn danh" ||
                        item.voterName.trim().toLowerCase() === "ẩn danh";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          {/* 1. Số thứ tự (TT) */}
                          <td className="py-3 px-2 text-center font-bold text-slate-500 whitespace-nowrap">
                            {stt}
                          </td>

                          {/* 2. Họ tên cử tri */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {!isAnonymous ? (
                              <div className="font-bold text-slate-900 text-xs">
                                {item.voterName}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 italic">
                                Ẩn danh
                              </span>
                            )}
                            <div className="text-[10px] font-mono text-red-800/80 mt-0.5">
                              {item.ticketCode}
                            </div>
                          </td>

                          {/* 3. Thôn/buôn */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                              {item.village}
                            </span>
                          </td>

                          {/* 4. Ngày ý kiến */}
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>

                          {/* 5. Nội dung ý kiến - Ẩn, bấm vào hiện rộng ra màn hình */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedContentItem(item)}
                              title="Bấm để xem chi tiết toàn bộ nội dung cử tri phản ánh"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] border border-slate-300 shadow-xs transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              Xem nội dung
                            </button>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-2xs">
                                  <Paperclip className="w-2.5 h-2.5 text-amber-700" />
                                  {item.attachments.length} tệp
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 6. Trả lời - Nếu chưa cập nhật nội dung trả lời thì để mặc định là 'Đang xác minh, xử lý', trừ trường hợp đợi duyệt và đã có nội dung trả lời */}
                          <td className="py-3 px-3 text-center">
                            {isAnswered && item.officialResponse ? (
                              <button
                                onClick={() => setSelectedResponseItem(item)}
                                title="Bấm để xem toàn bộ văn bản trả lời và tài liệu có dấu đỏ"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300 shadow-xs transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Xem trả lời
                              </button>
                            ) : item.status === "Chờ duyệt" || item.isApproved === false ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-700" />
                                Đợi duyệt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-600" />
                                Đang xác minh, xử lý
                              </span>
                            )}
                          </td>

                          {/* 7. Đánh giá kết quả giải quyết - Phân tách 2 chế độ: Cử tri đăng nhập (dấu tích) và Khách xem (Màu sắc Xanh/Vàng/Đỏ) */}
                          <td className="py-3 px-3 text-center">
                            {isAnswered ? (
                              currentVoter ? (
                                /* GIAO DIỆN DÀNH CHO CỬ TRI ĐÃ ĐĂNG NHẬP: ĐƯỢC TÍCH CHỌN ĐÁNH GIÁ */
                                <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                  {(
                                    [
                                      { label: "Rất hài lòng", color: "bg-emerald-600 text-white font-bold" },
                                      { label: "Hài lòng", color: "bg-blue-600 text-white font-bold" },
                                      { label: "Chưa hài lòng", color: "bg-amber-600 text-white font-bold" },
                                    ] as const
                                  ).map((opt) => {
                                    const isChecked = currentRating === opt.label;
                                    return (
                                      <label
                                        key={opt.label}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer transition select-none ${
                                          isChecked
                                            ? `${opt.color} shadow-xs`
                                            : "text-slate-600 hover:bg-slate-200/80"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`rating-${item.id}`}
                                          value={opt.label}
                                          checked={isChecked}
                                          onChange={() => handleRate(item.id, opt.label)}
                                          className="w-3 h-3 text-red-700 focus:ring-0 cursor-pointer"
                                        />
                                        <span>{opt.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                /* GIAO DIỆN DÀNH CHO KHÁCH XEM (CHƯA ĐĂNG NHẬP): HIỆN SỐ LƯỢNG THEO MÀU SẮC XANH - VÀNG - ĐỎ */
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="inline-flex flex-wrap items-center justify-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-[11px]">
                                    {/* MÀU XANH: Rất hài lòng */}
                                    <span
                                      title="Số lượng cử tri đánh giá Rất hài lòng"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100/90 text-emerald-800 font-bold border border-emerald-300"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                      {item.ratingVerySatisfied || 0} Rất hài lòng
                                    </span>

                                    {/* MÀU VÀNG: Hài lòng */}
                                    <span
                                      title="Số lượng cử tri đánh giá Hài lòng"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/90 text-amber-800 font-bold border border-amber-300"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                      {item.ratingSatisfied || 0} Hài lòng
                                    </span>

                                    {/* MÀU ĐỎ: Chưa hài lòng */}
                                    <span
                                      title="Số lượng cử tri đánh giá Chưa hài lòng"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100/90 text-red-800 font-bold border border-red-300"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                      {item.ratingUnsatisfied || 0} Chưa hài lòng
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="text-[10px] text-red-700 hover:text-red-900 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                                  >
                                    <span>(Đăng nhập cử tri để đánh giá)</span>
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="inline-block text-slate-400 text-xs italic font-normal">
                                Chờ kết quả giải quyết
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                Trang trước
              </button>
              <span className="text-xs font-semibold px-2">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 5. MODAL XEM NỘI DUNG Ý KIẾN CỦA CỬ TRI (PHÓNG TO RỘNG RÃI) */}
      {selectedContentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base uppercase">
                  Nội dung ý kiến phản ánh của cử tri
                </h3>
              </div>
              <button
                onClick={() => setSelectedContentItem(null)}
                className="text-red-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <span className="font-mono font-bold text-red-800 text-sm">
                    {selectedContentItem.ticketCode}
                  </span>
                  <span className="text-slate-500">
                    Ngày gửi:{" "}
                    <strong className="text-slate-900">
                      {new Date(selectedContentItem.createdAt).toLocaleDateString("vi-VN")}
                    </strong>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-500">Cử tri phản ánh:</span>{" "}
                    <span className="font-bold text-slate-900">{selectedContentItem.voterName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Địa bàn thôn/buôn:</span>{" "}
                    <span className="font-bold text-slate-900">{selectedContentItem.village}</span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Lĩnh vực:</span>{" "}
                  <span className="inline-block bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-800">
                    {selectedContentItem.category}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nội dung phản ánh đầy đủ:
                </label>
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 text-slate-900 text-sm sm:text-base leading-relaxed font-medium">
                  {selectedContentItem.content}
                </div>
              </div>

              {/* Tệp tài liệu, hình ảnh đính kèm của cử tri nếu có */}
              {selectedContentItem.attachments && selectedContentItem.attachments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-red-700" />
                    Tệp tài liệu, hình ảnh minh chứng đính kèm ({selectedContentItem.attachments.length} tệp):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedContentItem.attachments.map((file, idx) => {
                      const isImg = file.type === "image" || [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((e) => file.name.toLowerCase().endsWith(e));
                      const isPdf = file.type === "pdf" || file.name.toLowerCase().endsWith(".pdf");

                      return (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:border-red-400 bg-slate-50 hover:bg-red-50/30 transition group shadow-2xs"
                        >
                          {isImg ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            </div>
                          ) : isPdf ? (
                            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              PDF
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              DOC
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-red-700">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {file.size < 1024 * 1024
                                ? `${(file.size / 1024).toFixed(0)} KB`
                                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}{" "}
                              • Xem / Tải về
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-red-600 flex-shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedContentItem(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL XEM VĂN BẢN TRẢ LỜI CỦA CƠ QUAN CHỨC NĂNG (PHÓNG TO RỘNG RÃI) */}
      {selectedResponseItem && selectedResponseItem.officialResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base uppercase">
                  Văn bản trả lời chính thức của cơ quan có thẩm quyền
                </h3>
              </div>
              <button
                onClick={() => setSelectedResponseItem(null)}
                className="text-emerald-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                  <span className="font-bold uppercase text-emerald-900 text-sm flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    {selectedResponseItem.officialResponse.answeringOrg}
                  </span>
                  <span className="text-slate-600 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    Ngày ban hành:{" "}
                    {new Date(selectedResponseItem.officialResponse.answeredAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="text-slate-600">
                  Trả lời cho hồ sơ số:{" "}
                  <span className="font-mono font-bold text-red-800">
                    {selectedResponseItem.ticketCode}
                  </span>{" "}
                  - Cử tri: <strong className="text-slate-900">{selectedResponseItem.voterName}</strong> (
                  {selectedResponseItem.village})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nội dung tóm tắt giải quyết cử tri:
                </label>
                <div className="p-4 bg-white rounded-xl border border-emerald-300/80 text-slate-900 text-sm sm:text-base leading-relaxed italic bg-emerald-50/20 shadow-xs">
                  &ldquo;{selectedResponseItem.officialResponse.responseContent}&rdquo;
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Người ký / Thụ lý:</span>{" "}
                  <span className="text-slate-900 font-black text-sm">
                    {selectedResponseItem.officialResponse.answeredBy}
                  </span>
                </div>

                {selectedResponseItem.officialResponse.documentUrl && (
                  <div className="w-full pt-2 border-t border-slate-200 mt-2">
                    <span className="block text-slate-600 font-semibold mb-1.5 flex items-center gap-1 text-[11px]">
                      <Paperclip className="w-3.5 h-3.5 text-red-700" />
                      Văn bản / Tệp đính kèm có dấu đỏ:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponseItem.officialResponse.documentUrl
                        .split(",")
                        .map((u) => u.trim())
                        .filter(Boolean)
                        .map((url, uIdx, allUrls) => {
                          const isPdf = url.toLowerCase().includes(".pdf");
                          return (
                            <a
                              key={uIdx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              {isPdf ? (
                                <FileText className="w-3.5 h-3.5 text-amber-200" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {allUrls.length > 1
                                  ? `Xem văn bản/ảnh ${uIdx + 1}${isPdf ? " (PDF)" : ""}`
                                  : "Xem văn bản trả lời có dấu đỏ"}
                              </span>
                            </a>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedResponseItem(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL GỬI Ý KIẾN MỚI DÀNH CHO NHÂN DÂN */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header modal */}
            <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base uppercase">
                  Gửi ý kiến phản ánh của cử tri
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-red-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung modal */}
            <div className="p-6 overflow-y-auto">
              {formSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">
                    Gửi ý kiến phản ánh thành công!
                  </h4>
                  <p className="text-sm text-slate-600 mt-2">
                    Ý kiến của cử tri đã được gửi thành công và đang chờ Cán bộ duyệt tiếp nhận. Sau khi Cán bộ phê duyệt, ý kiến sẽ được hiển thị công khai trên Cổng thông tin.
                  </p>
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl inline-block text-left w-full">
                    <p className="text-xs text-red-700 font-semibold uppercase">
                      Mã hồ sơ tra cứu của bạn:
                    </p>
                    <p className="text-2xl font-mono font-black text-red-800 mt-1">
                      {formSuccess}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      (Vui lòng lưu lại mã này để tra cứu tiến độ xử lý và văn bản trả lời trên trang chủ)
                    </p>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setShowSubmitModal(false)}
                      className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-sm cursor-pointer shadow"
                    >
                      Đóng cửa sổ
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Checkbox ẩn danh */}
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="isAnon"
                      checked={formData.isAnonymous}
                      onChange={(e) =>
                        setFormData({ ...formData, isAnonymous: e.target.checked })
                      }
                      className="rounded text-red-700 focus:ring-red-600 h-4 w-4"
                    />
                    <label htmlFor="isAnon" className="text-xs text-slate-800 font-medium cursor-pointer">
                      Gửi dưới dạng <span className="font-bold text-amber-900">Cử tri ẩn danh</span> (Họ tên sẽ không công khai ra bên ngoài)
                    </label>
                  </div>

                  {/* Thông báo cử tri đã đăng nhập xác thực */}
                  {currentVoter && !formData.isAnonymous && (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium animate-in fade-in duration-150">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Tài khoản Cử tri: <strong>{currentVoter.fullName}</strong>
                        {currentVoter.email && ` (${currentVoter.email})`} - Đã tự động điền sẵn thông tin.
                      </span>
                    </div>
                  )}

                  {/* Họ tên cử tri */}
                  {!formData.isAnonymous && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Họ và tên cử tri <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.voterName}
                        onChange={(e) =>
                          setFormData({ ...formData, voterName: e.target.value })
                        }
                        placeholder="Nhập họ và tên cử tri (Ví dụ: Nguyễn Văn A)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại liên hệ (để cán bộ xác minh khi cần)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Ví dụ: 0912.xxx.xxx"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Chọn Thôn / Buôn */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cử tri thuộc Thôn / Buôn <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.village}
                      onChange={(e) =>
                        setFormData({ ...formData, village: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                    >
                      {VILLAGES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chọn Lĩnh vực */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lĩnh vực kiến nghị / phản ánh <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nội dung */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nội dung ý kiến, kiến nghị cụ thể <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Mô tả cụ thể địa điểm, nội dung sự việc và kiến nghị hướng giải quyết đối với chính quyền xã..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Tối thiểu 10 ký tự. Vui lòng phản ánh trung thực, mang tính xây dựng.
                    </p>
                  </div>

                  {/* Đính kèm tài liệu, hình ảnh minh chứng (Tối đa 4 tệp, dưới 5MB/tệp) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-red-700" />
                        Tệp đính kèm (Hình ảnh, PDF, Word...)
                      </label>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {attachedFiles.length}/4 tệp (Dưới 5MB/tệp)
                      </span>
                    </div>

                    {fileError && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{fileError}</span>
                      </div>
                    )}

                    {/* Danh sách các tệp cử tri đã chọn */}
                    {attachedFiles.length > 0 && (
                      <div className="space-y-2">
                        {attachedFiles.map((file, idx) => {
                          const ext = "." + file.name.split(".").pop()?.toLowerCase();
                          const isImg = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
                          const isPdf = ext === ".pdf";
                          const sizeFormatted =
                            file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(0)} KB`
                              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isImg ? (
                                  <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                      onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                                    />
                                  </div>
                                ) : isPdf ? (
                                  <div className="w-8 h-8 rounded bg-red-100 text-red-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                    PDF
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                    DOC
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate max-w-[240px] sm:max-w-[320px]">
                                    {file.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {sizeFormatted}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                title="Xóa tệp này"
                                className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nút chọn tệp nếu chưa đủ 4 tệp */}
                    {attachedFiles.length < MAX_FILES && (
                      <div>
                        <label
                          htmlFor="citizen-file-upload"
                          className="flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-slate-300 hover:border-red-500 bg-white hover:bg-red-50/20 rounded-lg text-xs font-semibold text-slate-700 hover:text-red-700 transition cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span>Bấm để tải tệp lên (Hình ảnh, PDF, Word)</span>
                        </label>
                        <input
                          id="citizen-file-upload"
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500">
                      * Chấp nhận: Ảnh (.jpg, .png, .webp), PDF (.pdf), Word (.doc, .docx). Tối đa 4 tệp, mỗi tệp dưới 5MB.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-sm flex items-center gap-2 cursor-pointer shadow disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Gửi phản ánh ngay
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. CHÂN TRANG (FOOTER) CHUẨN HÀNH CHÍNH */}
      <footer className="bg-slate-900 text-slate-300 border-t-4 border-red-700 py-10 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 relative bg-white rounded-full p-1">
                <Image src="/logo.png" alt="Logo" fill className="object-contain p-0.5" />
              </div>
              <div>
                <p className="font-bold text-white uppercase text-sm">
                  ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
                </p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Cổng thông tin điện tử tiếp nhận và công khai kết quả trả lời kiến nghị, phản ánh của cử tri 20 thôn, buôn thuộc Xã Ea Súp, Tỉnh Đắk Lắk.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">
              Thông tin liên hệ công vụ
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Trụ sở UB MTTQ Việt Nam xã Ea Súp</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Đường dây nóng: 0888.023.023</span>
              </li>
              <li className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Email: Easupsohoa@gmail.com</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">
              Cổng dịch vụ liên kết
            </h4>
            <div className="flex flex-col space-y-2 text-slate-400">
              <Link href="/admin/login" className="hover:text-amber-400 transition">
                • Cổng đăng nhập Cán bộ Quản trị
              </Link>
              <a
                href="https://dichvucong.gov.vn"
                target="_blank"
                rel="noreferrer"
                className="hover:text-amber-400 transition"
              >
                • Cổng Dịch vụ công Quốc gia
              </a>
              <a
                href="https://daklak.gov.vn"
                target="_blank"
                rel="noreferrer"
                className="hover:text-amber-400 transition"
              >
                • Cổng Thông tin điện tử Tỉnh Đắk Lắk
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-center text-slate-500">
          <p>© 2026 Bản quyền thuộc về Ủy ban MTTQ Việt Nam Xã Ea Súp. Vận hành trên nền tảng Next.js & Docker Compose.</p>
        </div>
      </footer>

      {/* MODAL ĐĂNG NHẬP DÀNH CHO CỬ TRI (GOOGLE OAUTH & SĐT) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={(voter) => {
          setCurrentVoter(voter);
          fetchData();
        }}
      />

      {/* MODAL CẬP NHẬT THÔNG TIN THÔN/BUÔN & SĐT CỬ TRI */}
      <VoterProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        voter={currentVoter}
        onUpdateSuccess={(updated) => {
          if (currentVoter) {
            setCurrentVoter({ ...currentVoter, ...updated });
          }
        }}
      />

      {/* TIỆN ÍCH TRỢ LÝ ẢO AI CHATBOT CÔNG VỤ XÃ EA SÚP */}
      <ChatbotWidget />
    </div>
  );
}
