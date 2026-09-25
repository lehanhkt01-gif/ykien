"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Inbox,
  AlertCircle,
  ExternalLink,
  Printer,
  Download,
  Building2,
  Calendar,
  MapPin,
  Send,
  X,
  RefreshCw,
  Eye,
  Edit3,
  PlusCircle,
  Upload,
  Trash2,
  Key,
  Settings,
  Bot,
  FileSpreadsheet,
  Paperclip,
  Users,
  UserX,
  ShieldAlert,
  Sparkles,
  FilterX,
  UserCheck,
  Save,
  FileText,
  ShieldCheck,
  Lock,
  EyeOff,
  UserCog,
} from "lucide-react";
import { VILLAGES, CATEGORIES, ANSWERING_ORGS, STATUS_LIST } from "@/lib/constants";
import * as XLSX from "xlsx";
import ReportExportModal from "@/components/ReportExportModal";

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

interface CurrentUser {
  userId: number;
  username: string;
  fullName: string;
  role: string;
}

export interface AdminVoterItem {
  id: string | number;
  name: string;
  email?: string | null;
  phone?: string | null;
  village?: string | null;
  image?: string | null;
  role: string;
  authProvider: "google" | "phone" | "system";
  createdAt: string;
  feedbackCount: number;
  feedbacks: { id: number; ticketCode: string; content: string; status: string; createdAt: string }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedbackItem[]>([]);

  // Filters (Đầy đủ tương tự như trang chủ + bộ lọc Chờ duyệt)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedStatus, setSelectedStatus] = useState("Tất cả");

  // 1. Modal Respond State
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [answeringOrg, setAnsweringOrg] = useState<string>(ANSWERING_ORGS[0]);
  const [responseContent, setResponseContent] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [responseFilesError, setResponseFilesError] = useState<string | null>(null);
  const [isUploadingResponseFiles, setIsUploadingResponseFiles] = useState(false);

  // 2. Modal Thêm Mới Hồ Sơ
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVoterName, setNewVoterName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVillage, setNewVillage] = useState<string>(VILLAGES[0]);
  const [newCategory, setNewCategory] = useState<string>(CATEGORIES[0]);
  const [newContent, setNewContent] = useState("");
  const [newStatus, setNewStatus] = useState("Đã tiếp nhận");
  const [newAnsweringOrg, setNewAnsweringOrg] = useState<string>(ANSWERING_ORGS[0]);
  const [newResponseContent, setNewResponseContent] = useState("");
  const [newDocumentUrl, setNewDocumentUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 3. Modal Sửa Hồ Sơ
  const [editingItem, setEditingItem] = useState<FeedbackItem | null>(null);
  const [editVoterName, setEditVoterName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVillage, setEditVillage] = useState<string>(VILLAGES[0]);
  const [editCategory, setEditCategory] = useState<string>(CATEGORIES[0]);
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("Đã tiếp nhận");
  const [isEditing, setIsEditing] = useState(false);

  // 4. Modal Nhập File Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importNotice, setImportNotice] = useState<{ success: boolean; msg: string } | null>(null);

  // 5. Modal Cấu Hình AI Chatbot & API Key
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chatbotApiKey, setChatbotApiKey] = useState("");
  const [chatbotModel, setChatbotModel] = useState("gemini-2.5-flash");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // 6. Modal Xuất Dữ Liệu Excel (Đồng bộ chuẩn CSDL 17 cột)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOption, setExportOption] = useState<"all" | "filtered">("all");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // 7. Modal Xuất Báo Cáo Thống Kê
  const [showReportModal, setShowReportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 8. Quản lý trạng thái Duyệt hồ sơ
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // 9. QUẢN LÝ CỬ TRI ĐĂNG NHẬP (GOOGLE OAUTH & SỐ ĐIỆN THOẠI)
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [voters, setVoters] = useState<AdminVoterItem[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);
  const [voterSearch, setVoterSearch] = useState("");
  const [deletingVoter, setDeletingVoter] = useState<AdminVoterItem | null>(null);
  const [deleteWithFeedbacks, setDeleteWithFeedbacks] = useState(false);
  const [isDeletingVoter, setIsDeletingVoter] = useState(false);
  const [voterNotice, setVoterNotice] = useState<{ success: boolean; msg: string } | null>(null);
  const [selectedVoterDetail, setSelectedVoterDetail] = useState<AdminVoterItem | null>(null);

  // 10. QUẢN LÝ TÀI KHOẢN CÁN BỘ (ADMIN TOÀN QUYỀN ONLY)
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [officers, setOfficers] = useState<any[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officerNotice, setOfficerNotice] = useState<{ success: boolean; msg: string } | null>(null);
  const [officerSearch, setOfficerSearch] = useState("");
  const [editingOfficer, setEditingOfficer] = useState<any | null>(null);
  const [editOfficerUsername, setEditOfficerUsername] = useState("");
  const [editOfficerPassword, setEditOfficerPassword] = useState("");
  const [editOfficerFullName, setEditOfficerFullName] = useState("");
  const [editOfficerOrg, setEditOfficerOrg] = useState("");
  const [showOfficerPassword, setShowOfficerPassword] = useState(false);
  const [isSavingOfficer, setIsSavingOfficer] = useState(false);
  const [showAddOfficerForm, setShowAddOfficerForm] = useState(false);
  const [newOfficerUsername, setNewOfficerUsername] = useState("");
  const [newOfficerPassword, setNewOfficerPassword] = useState("12345678@");
  const [newOfficerFullName, setNewOfficerFullName] = useState("");
  const [newOfficerOrg, setNewOfficerOrg] = useState<string>(ANSWERING_ORGS[0]);

  // Kiểm tra xác thực cán bộ
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      if (!data.success || !data.user) {
        router.push("/admin/login");
        return;
      }
      setCurrentUser(data.user);
    } catch (e) {
      router.push("/admin/login");
    }
  };

  // Tải danh sách hồ sơ
  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", "200");
      params.append("admin", "true");
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (selectedVillage !== "Tất cả") params.append("village", selectedVillage);
      if (selectedCategory !== "Tất cả") params.append("category", selectedCategory);
      if (selectedStatus !== "Tất cả") params.append("status", selectedStatus);

      const res = await fetch(`/api/feedback?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách cử tri đăng nhập
  const loadVoters = async (q?: string) => {
    setVotersLoading(true);
    try {
      const url = q ? `/api/admin/voters?search=${encodeURIComponent(q)}` : "/api/admin/voters";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setVoters(data.voters || []);
      }
    } catch (e) {
      console.error("Lỗi nạp cử tri:", e);
    } finally {
      setVotersLoading(false);
    }
  };

  // Mở modal Quản lý Cử tri
  const handleOpenVoterModal = () => {
    setShowVoterModal(true);
    setVoterNotice(null);
    setVoterSearch("");
    loadVoters();
  };

  // Xóa tài khoản cử tri rác
  const confirmDeleteVoter = async () => {
    if (!deletingVoter) return;
    setIsDeletingVoter(true);
    setVoterNotice(null);
    try {
      const res = await fetch("/api/admin/voters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deletingVoter.id,
          email: deletingVoter.email,
          phone: deletingVoter.phone,
          deleteFeedbacks: deleteWithFeedbacks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVoterNotice({ success: true, msg: data.message });
        setDeletingVoter(null);
        setDeleteWithFeedbacks(false);
        await loadVoters(voterSearch);
        await loadFeedbacks(); // Cập nhật lại danh sách ý kiến nếu có xóa kèm
      } else {
        setVoterNotice({ success: false, msg: data.message || "Không thể xóa cử tri" });
      }
    } catch (err) {
      setVoterNotice({ success: false, msg: "Lỗi kết nối máy chủ khi xóa cử tri" });
    } finally {
      setIsDeletingVoter(false);
    }
  };

  // Tải danh sách cán bộ
  const loadOfficers = async () => {
    setOfficersLoading(true);
    try {
      const res = await fetch("/api/admin/officers");
      const data = await res.json();
      if (data.success) {
        setOfficers(data.officers || []);
      }
    } catch (e) {
      console.error("Lỗi nạp danh sách cán bộ:", e);
    } finally {
      setOfficersLoading(false);
    }
  };

  // Mở modal Quản lý tài khoản cán bộ
  const handleOpenOfficerModal = () => {
    setShowOfficerModal(true);
    setOfficerNotice(null);
    setEditingOfficer(null);
    setShowAddOfficerForm(false);
    setOfficerSearch("");
    loadOfficers();
  };

  // Bắt đầu sửa tài khoản cán bộ
  const handleStartEditOfficer = (officer: any) => {
    setEditingOfficer(officer);
    setEditOfficerUsername(officer.username);
    setEditOfficerPassword("");
    setEditOfficerFullName(officer.fullName);
    setEditOfficerOrg(officer.org);
    setShowOfficerPassword(false);
    setOfficerNotice(null);
  };

  // Lưu chỉnh sửa tài khoản cán bộ
  const handleSaveOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficer) return;

    if (!editOfficerUsername.trim()) {
      setOfficerNotice({ success: false, msg: "Tên đăng nhập không được để trống" });
      return;
    }

    if (editOfficerPassword.trim() && editOfficerPassword.trim().length < 6) {
      setOfficerNotice({ success: false, msg: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }

    setIsSavingOfficer(true);
    setOfficerNotice(null);
    try {
      const res = await fetch("/api/admin/officers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingOfficer.id,
          username: editOfficerUsername.trim(),
          password: editOfficerPassword.trim() || undefined,
          fullName: editOfficerFullName.trim(),
          org: editOfficerOrg.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOfficerNotice({ success: true, msg: data.message });
        setEditingOfficer(null);
        await loadOfficers();
      } else {
        setOfficerNotice({ success: false, msg: data.message || "Lỗi khi cập nhật tài khoản cán bộ" });
      }
    } catch (err) {
      setOfficerNotice({ success: false, msg: "Lỗi kết nối máy chủ khi cập nhật tài khoản" });
    } finally {
      setIsSavingOfficer(false);
    }
  };

  // Tạo tài khoản cán bộ mới
  const handleCreateOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficerUsername.trim() || !newOfficerFullName.trim()) {
      setOfficerNotice({ success: false, msg: "Vui lòng nhập đầy đủ Tên đăng nhập và Họ tên cán bộ" });
      return;
    }

    setIsSavingOfficer(true);
    setOfficerNotice(null);
    try {
      const res = await fetch("/api/admin/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newOfficerUsername.trim(),
          password: newOfficerPassword.trim() || "12345678@",
          fullName: newOfficerFullName.trim(),
          org: newOfficerOrg.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOfficerNotice({ success: true, msg: data.message });
        setShowAddOfficerForm(false);
        setNewOfficerUsername("");
        setNewOfficerFullName("");
        await loadOfficers();
      } else {
        setOfficerNotice({ success: false, msg: data.message || "Lỗi khi tạo mới tài khoản cán bộ" });
      }
    } catch (err) {
      setOfficerNotice({ success: false, msg: "Lỗi kết nối máy chủ khi tạo mới tài khoản" });
    } finally {
      setIsSavingOfficer(false);
    }
  };

  // Duyệt tiếp nhận ý kiến cử tri
  const handleApprove = async (item: FeedbackItem) => {
    if (
      !confirm(
        `Xác nhận DUYỆT và công khai ý kiến của cử tri "${item.voterName}" (${item.ticketCode}) lên Cổng thông tin?`
      )
    ) {
      return;
    }

    setApprovingId(item.id);
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setExportNotice(`Đã duyệt thành công hồ sơ ${item.ticketCode}! Dữ liệu hiện đã xuất hiện trên giao diện khách và cử tri.`);
        await loadFeedbacks();
      } else {
        alert(data.message || "Lỗi khi duyệt hồ sơ");
      }
    } catch (err: any) {
      console.error(err);
      alert("Đã xảy ra lỗi khi duyệt hồ sơ");
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadFeedbacks();
    }
  }, [currentUser, selectedVillage, selectedCategory, selectedStatus]);

  // Đăng xuất cán bộ: chuyển về trang chủ vai trò là khách
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (e) {}
    window.location.href = "/";
  };

  // Mở modal thụ lý trả lời
  const handleOpenRespondModal = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    const orgMap: Record<string, string> = {
      mttq: "Ban Thường trực Ủy ban MTTQ Việt Nam Xã Ea Súp",
      ubnd: "Ủy ban Nhân dân xã Ea Súp",
      hdnd: "Thường trực Hội đồng Nhân dân xã Ea Súp",
      danguy: "Đảng ủy xã Ea Súp",
      congan: "Ban Chỉ huy Công an xã Ea Súp",
      yte: "Trạm Y tế xã Ea Súp",
      quansu: "Ban Chỉ huy Quân sự xã Ea Súp",
    };
    const userOrg = currentUser?.username ? orgMap[currentUser.username.toLowerCase()] : undefined;
    setAnsweringOrg(item.officialResponse?.answeringOrg || userOrg || ANSWERING_ORGS[0]);
    setResponseContent(item.officialResponse?.responseContent || "");
    setDocumentUrl(item.officialResponse?.documentUrl || "");
    setResponseFiles([]);
    setResponseFilesError(null);
    setActionSuccessMsg(null);
  };

  // Chọn file hình ảnh, PDF đính kèm trả lời (tối đa 5 file, mỗi file < 5MB)
  const handleResponseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResponseFilesError(null);
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);

    if (responseFiles.length + selected.length > 5) {
      setResponseFilesError("Chỉ được đính kèm tối đa 5 file (ảnh hoặc PDF).");
      return;
    }

    const invalidType = selected.find((f) => {
      const ext = f.name.toLowerCase();
      const isImg = [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((e) => ext.endsWith(e));
      const isPdf = ext.endsWith(".pdf");
      return !isImg && !isPdf;
    });

    if (invalidType) {
      setResponseFilesError(`Tệp "${invalidType.name}" không hợp lệ. Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP) hoặc PDF.`);
      return;
    }

    const oversizeFile = selected.find((f) => f.size > 5 * 1024 * 1024);
    if (oversizeFile) {
      setResponseFilesError(`Tệp "${oversizeFile.name}" vượt quá dung lượng cho phép (tối đa dưới 5MB/file).`);
      return;
    }

    setResponseFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const handleRemoveResponseFile = (index: number) => {
    setResponseFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Gửi thông tin trả lời
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    if (!responseContent.trim() || responseContent.length < 5) {
      alert("Vui lòng nhập nội dung trả lời chi tiết");
      return;
    }

    setIsSubmittingResponse(true);
    try {
      let finalDocUrl = documentUrl.trim();

      // Nếu có tệp mới được đính kèm, thực hiện upload lên server
      if (responseFiles.length > 0) {
        setIsUploadingResponseFiles(true);
        const formData = new FormData();
        responseFiles.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && Array.isArray(uploadData.files)) {
          const uploadedUrls = uploadData.files.map((f: any) => f.url).join(", ");
          finalDocUrl = finalDocUrl ? `${finalDocUrl}, ${uploadedUrls}` : uploadedUrls;
        } else {
          alert(uploadData.message || "Lỗi khi tải tệp lên máy chủ");
          setIsSubmittingResponse(false);
          setIsUploadingResponseFiles(false);
          return;
        }
        setIsUploadingResponseFiles(false);
      }

      const res = await fetch("/api/admin/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId: selectedFeedback.id,
          answeringOrg,
          responseContent: responseContent.trim(),
          documentUrl: finalDocUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg("Đã lưu thông tin trả lời và cập nhật trạng thái thành công!");
        loadFeedbacks();
        setTimeout(() => {
          setSelectedFeedback(null);
          setActionSuccessMsg(null);
          setResponseFiles([]);
        }, 1200);
      } else {
        alert(data.message || "Lỗi khi cập nhật");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi mạng");
    } finally {
      setIsSubmittingResponse(false);
      setIsUploadingResponseFiles(false);
    }
  };

  // Xử lý Thêm mới hồ sơ
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      alert("Vui lòng nhập nội dung ý kiến phản ánh");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterName: newVoterName,
          phone: newPhone,
          village: newVillage,
          category: newCategory,
          content: newContent,
          status: newStatus,
          answeringOrg: newAnsweringOrg,
          responseContent: newResponseContent,
          documentUrl: newDocumentUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewVoterName("");
        setNewPhone("");
        setNewContent("");
        setNewResponseContent("");
        setNewDocumentUrl("");
        loadFeedbacks();
        alert("Đã thêm hồ sơ ý kiến cử tri thành công!");
      } else {
        alert(data.message || "Lỗi tạo hồ sơ");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsCreating(false);
    }
  };

  // Mở modal Sửa hồ sơ
  const handleOpenEdit = (item: FeedbackItem) => {
    setEditingItem(item);
    setEditVoterName(item.voterName);
    setEditPhone(item.phone || "");
    setEditVillage(item.village);
    setEditCategory(item.category);
    setEditContent(item.content);
    setEditStatus(item.status);
  };

  // Xử lý Cập nhật hồ sơ (Sửa)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/admin/feedback/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterName: editVoterName,
          phone: editPhone,
          village: editVillage,
          category: editCategory,
          content: editContent,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        loadFeedbacks();
        alert("Cập nhật hồ sơ thành công!");
      } else {
        alert(data.message || "Lỗi cập nhật");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsEditing(false);
    }
  };

  // Xử lý Xóa hồ sơ
  const handleDelete = async (item: FeedbackItem) => {
    const confirmDelete = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa hồ sơ [${item.ticketCode}] của cử tri ${item.voterName} không? Hành động này không thể hoàn tác.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        loadFeedbacks();
        alert("Đã xóa hồ sơ thành công!");
      } else {
        alert(data.message || "Lỗi xóa hồ sơ");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    }
  };

  // Tải file mẫu Excel chuẩn đồng bộ 100% tiêu chuẩn CSDL (17 trường)
  const handleDownloadExcelTemplate = () => {
    // Kích hoạt tải tệp qua API Server để Edge/Chrome gán chuẩn đuôi .xlsx và icon Excel
    const link = document.createElement("a");
    link.href = "/api/admin/export?template=true";
    link.setAttribute("download", "Mau_Nhap_Y_Kien_Cu_Tri_EaSup_Chuan_CSDL.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Nạp dữ liệu từ file Excel
  const handleImportExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert("Vui lòng chọn file Excel");
      return;
    }

    setImportLoading(true);
    setImportNotice(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setImportNotice({ success: true, msg: data.message });
        setSearchTerm("");
        setSelectedVillage("Tất cả");
        setSelectedStatus("Tất cả");
        await loadFeedbacks();
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportNotice(null);
        }, 2500);
      } else {
        setImportNotice({ success: false, msg: data.message || "Lỗi xử lý file Excel" });
      }
    } catch (err) {
      setImportNotice({ success: false, msg: "Lỗi kết nối máy chủ khi tải file" });
    } finally {
      setImportLoading(false);
    }
  };

  // Mở modal cấu hình AI Chatbot & tải settings
  const handleOpenSettings = async () => {
    setShowSettingsModal(true);
    setSettingsLoading(true);
    setSettingsSaved(false);

    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setChatbotApiKey(data.settings.CHATBOT_API_KEY || "");
        setChatbotModel(data.settings.CHATBOT_MODEL || "gemini-2.5-flash");
        setSystemPrompt(data.settings.SYSTEM_PROMPT || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Lưu cấu hình AI Chatbot
  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          CHATBOT_API_KEY: chatbotApiKey,
          CHATBOT_MODEL: chatbotModel,
          SYSTEM_PROMPT: systemPrompt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      } else {
        alert(data.message || "Lỗi lưu cấu hình");
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSettingsLoading(false);
    }
  };

  // Xuất file Excel chuẩn hóa 100% đồng bộ tiêu chuẩn CSDL (17 trường) và mẫu nhập file
  const handleExportExcel = (exportType: "all" | "filtered" = "all") => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", exportType);
      if (exportType === "filtered") {
        if (searchTerm.trim()) params.append("search", searchTerm.trim());
        if (selectedVillage !== "Tất cả") params.append("village", selectedVillage);
        if (selectedStatus !== "Tất cả") params.append("status", selectedStatus);
      }

      // Kích hoạt tải tệp qua API Server để Edge/Chrome tự động gán tên tệp chuẩn .xlsx và icon Excel
      const link = document.createElement("a");
      link.href = `/api/admin/export?${params.toString()}`;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const countMsg = exportType === "all" ? "toàn bộ CSDL" : `${items.length} hồ sơ theo bộ lọc`;
      setExportNotice(`Đã kích hoạt tải xuống tệp Excel chuẩn hóa 100% CSDL (${countMsg})! Tệp có đuôi .xlsx đầy đủ, tự động mở bằng Microsoft Excel.`);
      setShowExportModal(false);
      setTimeout(() => setExportNotice(null), 25000);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);
      alert("Đã xảy ra lỗi khi tạo file Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <RefreshCw className="w-8 h-8 text-red-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 1. THANH ĐIỀU HƯỚNG QUẢN TRỊ */}
      <header className="bg-slate-900 text-white shadow-md border-b-2 border-red-700 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 relative bg-white rounded-full p-1 border border-amber-400">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <div>
              <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase block">
                BẢNG ĐIỀU KHIỂN CÔNG VỤ
              </span>
              <h1 className="text-sm sm:text-base font-bold text-white uppercase">
                ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút Quản lý tài khoản cán bộ (Chỉ Quản trị viên ADMIN toàn quyền) */}
            {currentUser.role === "ADMIN" && (
              <button
                onClick={handleOpenOfficerModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold shadow transition cursor-pointer border border-indigo-400/50"
                title="Quản lý tài khoản cán bộ: thay đổi tên đăng nhập và mật khẩu công vụ"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden sm:inline">Quản lý tài khoản cán bộ</span>
              </button>
            )}

            {/* Nút Quản lý Cử tri đăng nhập */}
            <button
              onClick={handleOpenVoterModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow transition cursor-pointer border border-emerald-500/50"
              title="Quản lý cử tri đăng nhập, kiểm tra danh sách cử tri, xóa tài khoản cử tri rác"
            >
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Quản lý Cử tri</span>
            </button>

            {/* Nút Quản lý API Key & Chatbot */}
            <button
              onClick={handleOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-bold shadow transition cursor-pointer border border-red-500/50"
              title="Quản lý API Key & Cấu hình Trợ lý AI Chatbot"
            >
              <Key className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Quản lý API Key Chatbot</span>
            </button>

            <Link
              href="/"
              className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded transition"
            >
              Về trang chủ
            </Link>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-right">
              <p className="text-xs font-bold text-white">{currentUser.fullName}</p>
              <p className="text-[10px] text-amber-400 font-mono font-semibold">
                Vai trò: {currentUser.role === "ADMIN" ? "Quản Trị Viên (Admin)" : "Cán Bộ Thụ Lý"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-lg text-red-400 hover:text-red-300 transition cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. NỘI DUNG CHÍNH */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Thống kê nhanh 4 thẻ sắc nét & trực quan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 1. Thẻ Chờ phê duyệt (Màu Hổ Phách Cảnh Báo) */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "Chờ duyệt" ? "Tất cả" : "Chờ duyệt")}
            className={`cursor-pointer p-4 rounded-xl border transition shadow-sm flex items-center justify-between ${
              selectedStatus === "Chờ duyệt"
                ? "bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400 shadow-md"
                : "bg-white hover:border-amber-400 border-amber-200"
            }`}
            title="Nhấn vào đây để xem các ý kiến cử tri chưa duyệt"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${
                    selectedStatus === "Chờ duyệt" ? "text-amber-100" : "text-amber-700"
                  }`}
                >
                  Chờ phê duyệt
                </p>
                {items.filter((i) => i.isApproved === false || i.status === "Chờ duyệt").length > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  selectedStatus === "Chờ duyệt" ? "text-white" : "text-amber-700"
                }`}
              >
                {items.filter((i) => i.isApproved === false || i.status === "Chờ duyệt").length}
              </p>
              <p
                className={`text-[10px] mt-0.5 font-medium ${
                  selectedStatus === "Chờ duyệt" ? "text-amber-100 font-bold" : "text-slate-400"
                }`}
              >
                {selectedStatus === "Chờ duyệt" ? "✓ Đang lọc ý kiến chưa duyệt" : "Bấm để lọc ý kiến chưa duyệt"}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                selectedStatus === "Chờ duyệt" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Tổng số ý kiến tiếp nhận */}
          <div
            onClick={() => setSelectedStatus("Tất cả")}
            className={`cursor-pointer p-4 rounded-xl border transition shadow-sm flex items-center justify-between ${
              selectedStatus === "Tất cả"
                ? "bg-white border-blue-500 ring-1 ring-blue-400"
                : "bg-white hover:border-slate-300 border-slate-200"
            }`}
            title="Nhấn để xem toàn bộ hồ sơ"
          >
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Tổng ý kiến tiếp nhận</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{items.length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Toàn bộ hồ sơ trên hệ thống</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Đang xác minh, xử lý */}
          <div
            onClick={() =>
              setSelectedStatus(
                selectedStatus === "Đang xác minh, xử lý" ? "Tất cả" : "Đang xác minh, xử lý"
              )
            }
            className={`cursor-pointer p-4 rounded-xl border transition shadow-sm flex items-center justify-between ${
              selectedStatus === "Đang xác minh, xử lý"
                ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 shadow-md"
                : "bg-white hover:border-amber-400 border-slate-200"
            }`}
            title="Nhấn để xem toàn bộ ý kiến đang xác minh, xử lý"
          >
            <div>
              <p
                className={`text-xs font-bold uppercase ${
                  selectedStatus === "Đang xác minh, xử lý" ? "text-amber-100" : "text-amber-800"
                }`}
              >
                Đang xác minh, xử lý
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  selectedStatus === "Đang xác minh, xử lý" ? "text-white" : "text-amber-700"
                }`}
              >
                {
                  items.filter(
                    (i) =>
                      i.status !== "Đã trả lời" &&
                      !i.officialResponse &&
                      i.isApproved !== false &&
                      i.status !== "Chờ duyệt"
                  ).length
                }
              </p>
              <p
                className={`text-[10px] mt-0.5 font-medium ${
                  selectedStatus === "Đang xác minh, xử lý" ? "text-amber-100" : "text-slate-400"
                }`}
              >
                Toàn bộ ý kiến đang xác minh, xử lý
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                selectedStatus === "Đang xác minh, xử lý"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* 4. Đã ban hành văn bản trả lời */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "Đã trả lời" ? "Tất cả" : "Đã trả lời")}
            className={`cursor-pointer p-4 rounded-xl border transition shadow-sm flex items-center justify-between ${
              selectedStatus === "Đã trả lời"
                ? "bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400 shadow-md"
                : "bg-white hover:border-emerald-400 border-emerald-200"
            }`}
            title="Nhấn để xem các ý kiến đã ban hành trả lời"
          >
            <div>
              <p
                className={`text-xs font-bold uppercase ${
                  selectedStatus === "Đã trả lời" ? "text-emerald-100" : "text-emerald-700"
                }`}
              >
                Đã trả lời công khai
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  selectedStatus === "Đã trả lời" ? "text-white" : "text-emerald-700"
                }`}
              >
                {items.filter((i) => i.status === "Đã trả lời").length}
              </p>
              <p
                className={`text-[10px] mt-0.5 font-medium ${
                  selectedStatus === "Đã trả lời" ? "text-emerald-100" : "text-slate-400"
                }`}
              >
                Đã có văn bản giải quyết chính thức
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                selectedStatus === "Đã trả lời" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Thanh công cụ quản trị & Bộ lọc */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 no-print space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {/* Nút Thêm mới ý kiến */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm hồ sơ ý kiến
              </button>

              {/* Nút Nhập file Excel */}
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Nhập file Excel
              </button>

              {/* Nút Xuất file Excel chuẩn CSDL */}
              <button
                onClick={() => setShowExportModal(true)}
                disabled={exportLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                title="Mở bảng xuất file Excel chuẩn hóa 100% đồng bộ với file nhập (17 cột)"
              >
                {exportLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Xuất file Excel
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút Mở Quản lý Cử tri */}
              <button
                onClick={handleOpenVoterModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition cursor-pointer border border-slate-600"
                title="Xem danh sách cử tri đăng nhập, kiểm tra số ý kiến và xóa cử tri rác"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                Quản lý Cử tri
              </button>

              {/* Nút Xuất Báo Cáo Thống Kê (Thay cho In báo cáo HĐND) */}
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs transition cursor-pointer border border-indigo-700"
                title="Xuất báo cáo thống kê theo giai đoạn, tháng, quý, 6 tháng, năm & đánh giá cử tri"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                Xuất báo cáo thống kê
              </button>
            </div>
          </div>

          {/* Thông báo kết quả xuất file thành công */}
          {exportNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{exportNotice}</span>
              </div>
              <button
                onClick={() => setExportNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer font-semibold ml-2"
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          )}

          {/* Ô lọc và tìm kiếm - Đầy đủ 4 cột tương tự trang chủ + lọc Chưa duyệt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Tìm kiếm từ khóa */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadFeedbacks()}
                placeholder="Tìm mã hồ sơ, họ tên, SĐT, từ khóa..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            {/* 2. Thôn / Buôn */}
            <div>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              >
                <option value="Tất cả">-- Tất cả 20 Thôn/Buôn --</option>
                {VILLAGES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Lĩnh vực phản ánh (Tương tự như trang chủ) */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              >
                <option value="Tất cả">-- Tất cả 8 Lĩnh vực --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Trạng thái (Bổ sung Chờ duyệt / Chưa duyệt) */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full py-1.5 px-3 bg-slate-50 border rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none font-semibold ${
                  selectedStatus === "Chờ duyệt"
                    ? "border-amber-500 text-amber-700 bg-amber-50"
                    : "border-slate-300 text-slate-800"
                }`}
              >
                <option value="Tất cả">-- Tất cả trạng thái --</option>
                <option value="Chờ duyệt" className="font-bold text-amber-600">
                  ⏳ Chờ duyệt (Cần phê duyệt)
                </option>
                <option value="Đã tiếp nhận">Đã tiếp nhận</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Đã trả lời">Đã ban hành trả lời</option>
              </select>

              {(searchTerm || selectedVillage !== "Tất cả" || selectedCategory !== "Tất cả" || selectedStatus !== "Tất cả") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedVillage("Tất cả");
                    setSelectedCategory("Tất cả");
                    setSelectedStatus("Tất cả");
                  }}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs flex-shrink-0 transition"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <FilterX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BẢNG QUẢN LÝ HỒ SƠ Ý KIẾN CỬ TRI (CÓ SỬA, XÓA, TRẢ LỜI, DUYỆT) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3">Mã hồ sơ</th>
                  <th className="p-3">Cử tri & Liên hệ</th>
                  <th className="p-3">Địa bàn</th>
                  <th className="p-3">Lĩnh vực</th>
                  <th className="p-3 w-1/3">Nội dung cử tri phản ánh</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-center no-print">Thao tác công vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-700" />
                      Đang tải danh sách hồ sơ...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      Không có hồ sơ nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isPending = item.status === "Chờ duyệt" || item.isApproved === false;
                    return (
                    <tr
                      key={item.id}
                      className={`transition ${
                        isPending
                          ? "bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/60"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-red-800 whitespace-nowrap">
                        {item.ticketCode}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.voterName}</div>
                        {item.phone && (
                          <div className="text-slate-500 font-mono text-[11px]">
                            {item.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{item.village}</td>
                      <td className="p-3">
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="line-clamp-2 text-slate-800 font-medium">{item.content}</p>
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold shadow-2xs">
                              <Paperclip className="w-2.5 h-2.5 text-amber-700" />
                              {item.attachments.length} tệp đính kèm
                            </span>
                          </div>
                        )}
                        {item.officialResponse && (
                          <div className="mt-1 text-[11px] text-emerald-800 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            Đã trả lời: {item.officialResponse.answeringOrg}
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Chờ duyệt
                            </span>
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={approvingId === item.id}
                              title="Duyệt để công khai ý kiến này lên Cổng thông tin"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {approvingId === item.id ? "Đang duyệt..." : "Duyệt"}
                            </button>
                          </div>
                        ) : item.status === "Đã trả lời" || Boolean(item.officialResponse) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Đã trả lời
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            Đang xác minh, xử lý
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center no-print whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Nút Trả lời */}
                          <button
                            onClick={() => handleOpenRespondModal(item)}
                            title="Ban hành văn bản trả lời cử tri"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-medium text-[11px] shadow-2xs transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            {item.officialResponse ? "Sửa trả lời" : "Trả lời"}
                          </button>

                          {/* Nút Sửa hồ sơ */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Sửa thông tin hồ sơ ý kiến"
                            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-slate-200 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xóa hồ sơ */}
                          <button
                            onClick={() => handleDelete(item)}
                            title="Xóa hồ sơ ý kiến này"
                            className="p-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 3. MODAL BAN HÀNH VĂN BẢN TRẢ LỜI CỦA CƠ QUAN NHÀ NƯỚC */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base uppercase">
                  Ban hành văn bản trả lời ý kiến cử tri
                </h3>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-red-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {actionSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {actionSuccessMsg}
                </div>
              )}

              {/* Thông tin câu hỏi của cử tri */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-mono font-bold text-red-800">
                    Mã hồ sơ: {selectedFeedback.ticketCode}
                  </span>
                  <span className="text-slate-500">
                    Địa bàn: <strong className="text-slate-900">{selectedFeedback.village}</strong>
                  </span>
                  <span className="text-slate-500">
                    Cử tri: <strong className="text-slate-900">{selectedFeedback.voterName}</strong>
                    {selectedFeedback.phone && ` (${selectedFeedback.phone})`}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Lĩnh vực:</span>{" "}
                  <span className="text-slate-900">{selectedFeedback.category}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Nội dung phản ánh:</span>
                  <p className="mt-1 text-slate-900 italic bg-white p-3 rounded border border-slate-200 leading-relaxed">
                    &ldquo;{selectedFeedback.content}&rdquo;
                  </p>
                </div>

                {/* Tệp đính kèm của cử tri nếu có */}
                {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-red-700" />
                      Tệp tài liệu, hình ảnh đính kèm của cử tri ({selectedFeedback.attachments.length} tệp):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedFeedback.attachments.map((f, i) => {
                        const isImg = f.type === "image" || [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((e) => f.name.toLowerCase().endsWith(e));
                        const isPdf = f.type === "pdf" || f.name.toLowerCase().endsWith(".pdf");

                        return (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 hover:border-red-400 rounded-lg text-slate-800 text-[11px] transition shadow-2xs group"
                          >
                            {isImg ? (
                              <img src={f.url} alt={f.name} className="w-8 h-8 object-cover rounded border border-slate-200 flex-shrink-0" />
                            ) : isPdf ? (
                              <span className="w-8 h-8 rounded bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                PDF
                              </span>
                            ) : (
                              <span className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                DOC
                              </span>
                            )}
                            <span className="truncate flex-1 font-medium group-hover:text-red-700">{f.name}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 flex-shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Form nhập nội dung trả lời */}
              <form onSubmit={handleSubmitResponse} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cơ quan / Đơn vị ban hành trả lời <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={answeringOrg}
                    onChange={(e) => setAnsweringOrg(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    {ANSWERING_ORGS.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nội dung văn bản trả lời chi tiết <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    placeholder="Nhập nội dung giải trình, kết quả xác minh, biện pháp xử lý hoặc văn bản trả lời chính thức của cơ quan thẩm quyền..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nội dung này sẽ được công khai minh bạch cho cử tri và nhân dân toàn xã theo dõi.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Tệp văn bản / hình ảnh có dấu đỏ giải quyết (Tùy chọn)
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Tối đa 5 file, dưới 5MB/file (PDF, JPG, PNG, WEBP)
                    </span>
                  </div>

                  {/* Nút chọn tệp từ máy */}
                  <div className="mb-2">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-red-200 hover:border-red-500 hover:bg-red-50/50 rounded-xl cursor-pointer transition text-xs font-semibold text-slate-700 group bg-slate-50">
                      <Upload className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                      <span>Tải văn bản PDF hoặc ảnh có dấu đỏ từ thiết bị</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleResponseFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Lỗi chọn file */}
                  {responseFilesError && (
                    <div className="p-2 mb-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{responseFilesError}</span>
                    </div>
                  )}

                  {/* Danh sách file đính kèm đã chọn */}
                  {responseFiles.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          Tệp đính kèm đã chọn ({responseFiles.length}/5):
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (Dung lượng mỗi file đều hợp lệ &lt; 5MB)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {responseFiles.map((file, idx) => {
                          const isPdf = file.name.toLowerCase().endsWith(".pdf");
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isPdf ? (
                                  <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                                ) : (
                                  <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                )}
                                <div className="truncate min-w-0">
                                  <p className="truncate font-semibold text-slate-800 text-[11px]">{file.name}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveResponseFile(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                                title="Bỏ chọn tệp này"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hoặc nhập Link văn bản */}
                  <div className="mt-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Hoặc dán đường link văn bản/ảnh trực tuyến (Google Drive, Cloud...)
                    </label>
                    <input
                      type="text"
                      value={documentUrl}
                      onChange={(e) => setDocumentUrl(e.target.value)}
                      placeholder="https://... (Link Google Drive, hình ảnh hoặc tài liệu đính kèm)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedback(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingResponse || isUploadingResponseFiles}
                    className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSubmittingResponse || isUploadingResponseFiles ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {isUploadingResponseFiles ? "Đang tải tệp lên..." : "Đang lưu..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Lưu thông tin trả lời
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL THÊM MỚI HỒ SƠ Ý KIẾN (ADMIN) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base uppercase">
                  Thêm mới hồ sơ ý kiến cử tri
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-red-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ tên cử tri
                  </label>
                  <input
                    type="text"
                    value={newVoterName}
                    onChange={(e) => setNewVoterName(e.target.value)}
                    placeholder="Để trống nếu là Ẩn danh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="09xx..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thôn / Buôn <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={newVillage}
                    onChange={(e) => setNewVillage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    {VILLAGES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trạng thái hồ sơ
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    <option value="Đã tiếp nhận">Đã tiếp nhận</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã trả lời">Đã trả lời</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lĩnh vực phản ánh <span className="text-red-600">*</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung ý kiến phản ánh <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ghi nhận chi tiết nội dung cử tri phản ánh..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              {/* Nếu chọn Đã trả lời thì cho nhập nội dung trả lời */}
              {newStatus === "Đã trả lời" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-emerald-800 uppercase">
                    Thông tin văn bản trả lời cử tri
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cơ quan trả lời
                    </label>
                    <select
                      value={newAnsweringOrg}
                      onChange={(e) => setNewAnsweringOrg(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      {ANSWERING_ORGS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nội dung trả lời
                    </label>
                    <textarea
                      rows={3}
                      value={newResponseContent}
                      onChange={(e) => setNewResponseContent(e.target.value)}
                      placeholder="Nội dung giải quyết chính thức..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Link văn bản dấu đỏ
                    </label>
                    <input
                      type="url"
                      value={newDocumentUrl}
                      onChange={(e) => setNewDocumentUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow disabled:opacity-50"
                >
                  {isCreating ? "Đang thêm..." : "Thêm hồ sơ vào CSDL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL SỬA HỒ SƠ Ý KIẾN (ADMIN) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base uppercase">
                  Sửa hồ sơ: {editingItem.ticketCode}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ tên cử tri
                  </label>
                  <input
                    type="text"
                    value={editVoterName}
                    onChange={(e) => setEditVoterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thôn / Buôn
                  </label>
                  <select
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    {VILLAGES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trạng thái hồ sơ
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    <option value="Đã tiếp nhận">Đã tiếp nhận</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã trả lời">Đã trả lời</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lĩnh vực phản ánh
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung phản ánh
                </label>
                <textarea
                  required
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs cursor-pointer shadow disabled:opacity-50"
                >
                  {isEditing ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL NHẬP DỮ LIỆU TỪ FILE EXCEL (IMPORT) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base uppercase">
                  Nhập dữ liệu ý kiến cử tri từ Excel
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-blue-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportExcelSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-blue-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  Hướng dẫn nạp dữ liệu:
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Hệ thống hỗ trợ file định dạng <strong>.xlsx, .xls, .csv</strong> chuẩn hóa 100% theo <strong>17 cột CSDL</strong> (khớp hoàn toàn với file tải từ nút <em>&quot;Xuất file Excel&quot;</em>). Bạn có thể dùng trực tiếp file đã xuất từ hệ thống để chỉnh sửa rồi nạp lại, hoặc tải file mẫu bên dưới.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="/api/admin/export/Mau_Nhap_Y_Kien_Cu_Tri_EaSup_Chuan_CSDL.xlsx?template=true"
                    download="Mau_Nhap_Y_Kien_Cu_Tri_EaSup_Chuan_CSDL.xlsx"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-900 underline cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file mẫu Excel chuẩn (.xlsx)
                  </a>
                </div>
              </div>

              {importNotice && (
                <div
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                    importNotice.success
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-red-50 border-red-300 text-red-800"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{importNotice.msg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Chọn file Excel từ máy tính của bạn:
                </label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer border border-slate-300 rounded-lg p-1"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={importLoading || !importFile}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang xử lý file...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Nạp dữ liệu vào CSDL
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XUẤT DỮ LIỆU EXCEL (ĐỒNG BỘ CHUẨN CSDL 17 CỘT VỚI NHẬP FILE) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center shadow-inner">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-tight">
                    Xuất Dữ Liệu Ý Kiến Cử Tri Ra Excel
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Chuẩn hóa 100% đồng bộ tiêu chuẩn CSDL &amp; Mẫu Nhập file (17 cột)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-emerald-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Thông báo chuẩn hóa */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đồng bộ hai chiều Xuất file &amp; Nhập file:
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Tệp Excel xuất ra có cấu trúc cột, kiểu dữ liệu và thứ tự trường hoàn toàn khớp với chức năng <strong>Nhập file Excel</strong>. Bạn có thể xuất ra để sao lưu, mở bằng Microsoft Excel để bổ sung / chỉnh sửa và nạp lại vào CSDL bất kỳ lúc nào mà không sợ lệch cột hay mất dữ liệu.
                </p>
              </div>

              {/* Tùy chọn phạm vi xuất */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">
                  1. Chọn phạm vi dữ liệu xuất:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportOption("all")}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between gap-2 ${
                      exportOption === "all"
                        ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Toàn bộ CSDL</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Khuyên dùng
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Xuất toàn bộ hồ sơ trong hệ thống để sao lưu, biên tập hoặc nạp lại.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportOption("filtered")}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between gap-2 ${
                      exportOption === "filtered"
                        ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Theo bộ lọc hiện tại</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {items.length} hồ sơ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Chỉ xuất các hồ sơ đang hiển thị theo từ khóa tìm kiếm và bộ lọc thôn/buôn.
                    </p>
                  </button>
                </div>
              </div>

              {/* Danh sách 17 cột chuẩn hóa */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">
                  2. Cấu trúc 17 cột tiêu chuẩn trong file Excel:
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                    {[
                      "1. STT",
                      "2. Mã hồ sơ",
                      "3. Họ và tên",
                      "4. Số điện thoại",
                      "5. Thôn/Buôn",
                      "6. Lĩnh vực",
                      "7. Nội dung ý kiến",
                      "8. Trạng thái",
                      "9. Ngày tiếp nhận",
                      "10. Cơ quan trả lời",
                      "11. Nội dung trả lời",
                      "12. Ngày trả lời",
                      "13. Người ký",
                      "14. Văn bản đính kèm",
                      "15. Rất hài lòng",
                      "16. Hài lòng",
                      "17. Chưa hài lòng",
                    ].map((col, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 font-medium truncate"
                        title={col}
                      >
                        {col}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer nút hành động */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <a
                href="/api/admin/export/Mau_Nhap_Y_Kien_Cu_Tri_EaSup_Chuan_CSDL.xlsx?template=true"
                download="Mau_Nhap_Y_Kien_Cu_Tri_EaSup_Chuan_CSDL.xlsx"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-900 underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file mẫu Excel (.xlsx)
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <a
                  href={`/api/admin/export/${
                    exportOption === "all"
                      ? `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_${new Date().toISOString().slice(0, 10)}_ToanBoCSDL.xlsx`
                      : `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_${new Date().toISOString().slice(0, 10)}_BoLoc.xlsx`
                  }?type=${exportOption}${
                    exportOption === "filtered"
                      ? `&search=${encodeURIComponent(searchTerm.trim())}&village=${encodeURIComponent(selectedVillage)}&status=${encodeURIComponent(selectedStatus)}`
                      : ""
                  }`}
                  download={
                    exportOption === "all"
                      ? `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_${new Date().toISOString().slice(0, 10)}_ToanBoCSDL.xlsx`
                      : `Danh_sach_y_kien_cu_tri_Xa_Ea_Sup_${new Date().toISOString().slice(0, 10)}_BoLoc.xlsx`
                  }
                  onClick={() => {
                    const countMsg = exportOption === "all" ? "toàn bộ CSDL" : `${items.length} hồ sơ`;
                    setExportNotice(`Đã kích hoạt tải xuống tệp Excel: "${exportOption === "all" ? "Toàn bộ CSDL" : "Bộ lọc"}". Tệp có đuôi .xlsx đầy đủ, mở trực tiếp bằng Microsoft Excel!`);
                    setShowExportModal(false);
                    setTimeout(() => setExportNotice(null), 25000);
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải file Excel ngay (.xlsx)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CẤU HÌNH AI CHATBOT & QUẢN LÝ API KEY (ADMIN ONLY) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-tight">
                    Cấu hình Trợ lý AI Chatbot Công Vụ
                  </h3>
                  <p className="text-[10px] text-amber-300">
                    Chỉ dành riêng cho tài khoản Quản Trị Viên (Admin)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-red-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettingsSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  Bảo mật API Key:
                </p>
                <p className="leading-relaxed">
                  API Key được lưu trữ trực tiếp trong CSDL quản trị nội bộ máy chủ, tuyệt đối không lộ ra bên ngoài cho người dân. Khi chưa có API Key, Chatbot sẽ tự động dùng bộ tri thức địa phương dự phòng (Offline Knowledge Base).
                </p>
              </div>

              {settingsSaved && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã lưu cấu hình AI Chatbot thành công!
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Google Gemini API Key:
                </label>
                <input
                  type="password"
                  value={chatbotApiKey}
                  onChange={(e) => setChatbotApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 font-mono text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Lấy API Key miễn phí từ Google AI Studio (aistudio.google.com).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  AI Model:
                </label>
                <select
                  value={chatbotModel}
                  onChange={(e) => setChatbotModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-red-600 focus:outline-none"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Nhanh & thông minh nhất)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Tiêu chuẩn)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Mô hình chuyên sâu)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Chỉ dẫn nghiệp vụ hệ thống (System Prompt):
                </label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Quy định thái độ, cách trả lời, thẩm quyền xử lý của xã Ea Súp..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {settingsLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Lưu cấu hình API Key
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL XUẤT BÁO CÁO THỐNG KÊ (THÁNG, QUÝ, 6 THÁNG, NĂM & ĐÁNH GIÁ CỬ TRI) */}
      <ReportExportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        feedbacks={items}
      />

      {/* 7. MODAL QUẢN LÝ CỬ TRI ĐĂNG NHẬP & XÓA CỬ TRI RÁC (MỚI BỔ SUNG) */}
      {showVoterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-600/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-tight text-white flex items-center gap-2">
                    Quản Lý Cử Tri Đăng Nhập & An Toàn Hệ Thống
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Theo dõi danh sách cử tri Google OAuth & SĐT, kiểm tra ý kiến đã gửi, xóa tài khoản rác / spam
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVoterModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông báo kết quả thao tác */}
            {voterNotice && (
              <div
                className={`p-3.5 mx-6 mt-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
                  voterNotice.success
                    ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                    : "bg-red-50 border border-red-300 text-red-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {voterNotice.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span>{voterNotice.msg}</span>
                </div>
                <button
                  onClick={() => setVoterNotice(null)}
                  className="text-slate-500 hover:text-slate-700 text-xs cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Thanh công cụ tìm kiếm và lọc cử tri */}
            <div className="p-4 sm:p-6 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={voterSearch}
                  onChange={(e) => {
                    setVoterSearch(e.target.value);
                    loadVoters(e.target.value);
                  }}
                  placeholder="Tìm cử tri theo Họ tên, Email Google, Số điện thoại, Thôn/Buôn..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                  Tổng số: <strong className="text-emerald-700 font-bold">{voters.length}</strong> cử tri
                </span>
                <button
                  onClick={() => loadVoters(voterSearch)}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition"
                  title="Làm mới danh sách cử tri"
                >
                  <RefreshCw className={`w-4 h-4 ${votersLoading ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Bảng Danh sách Cử tri */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {votersLoading ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-medium">Đang tải danh sách cử tri...</p>
                </div>
              ) : voters.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <UserX className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Chưa tìm thấy cử tri phù hợp</p>
                  <p className="text-[11px] text-slate-400">
                    Khi cử tri đăng nhập Google hoặc nhập SĐT gửi ý kiến, thông tin sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-3 text-center w-12">STT</th>
                        <th className="p-3">Họ tên & Cử tri</th>
                        <th className="p-3">Tài khoản & Liên hệ</th>
                        <th className="p-3">Thôn / Buôn</th>
                        <th className="p-3 text-center">Ý kiến đã gửi</th>
                        <th className="p-3">Thời gian ghi nhận</th>
                        <th className="p-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {voters.map((v, idx) => (
                        <tr key={String(v.id)} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {v.image ? (
                                <Image
                                  src={v.image}
                                  alt={v.name}
                                  width={34}
                                  height={34}
                                  className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-xs"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shadow-xs border border-emerald-200">
                                  {v.name.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{v.name}</p>
                                <span
                                  className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    v.authProvider === "google"
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {v.authProvider === "google" ? "Google OAuth" : "Số điện thoại"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="space-y-0.5">
                              {v.email && (
                                <p className="font-mono text-slate-800 text-[11px] flex items-center gap-1">
                                  <span className="text-slate-400">✉</span> {v.email}
                                </p>
                              )}
                              {v.phone && (
                                <p className="font-mono text-emerald-800 font-semibold text-[11px] flex items-center gap-1">
                                  <span className="text-slate-400">☎</span> {v.phone}
                                </p>
                              )}
                              {!v.email && !v.phone && (
                                <span className="text-slate-400 italic text-[11px]">Chưa cung cấp</span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            {v.village ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                <MapPin className="w-3 h-3 text-red-600" />
                                {v.village}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa cập nhật</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {v.feedbackCount > 0 ? (
                              <button
                                onClick={() => setSelectedVoterDetail(v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer"
                                title="Bấm để xem danh sách ý kiến của cử tri này"
                              >
                                <span>{v.feedbackCount} ý kiến</span>
                                <Eye className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-semibold">0 ý kiến</span>
                            )}
                          </td>

                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(v.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setDeletingVoter(v);
                                setDeleteWithFeedbacks(false);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold text-xs border border-red-200 transition cursor-pointer"
                              title="Xóa tài khoản cử tri rác hoặc tài khoản vi phạm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa cử tri rác</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-[11px] text-slate-500 italic">
                * Cán bộ quản trị có quyền dọn dẹp các tài khoản cử tri ảo, tài khoản rác hoặc tài khoản vi phạm quy định.
              </p>
              <button
                type="button"
                onClick={() => setShowVoterModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL XÁC NHẬN XÓA TÀI KHOẢN CỬ TRI RÁC */}
      {deletingVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 overflow-hidden">
            <div className="bg-red-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <h4 className="font-bold text-sm uppercase">Xác nhận xóa tài khoản cử tri rác</h4>
              </div>
              <button
                onClick={() => setDeletingVoter(null)}
                className="text-red-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-red-900 leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản cử tri sau khỏi hệ thống:
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-red-200 text-xs space-y-1">
                  <p className="font-bold text-slate-900">Họ tên: {deletingVoter.name}</p>
                  {deletingVoter.email && (
                    <p className="text-slate-600 font-mono text-[11px]">Email: {deletingVoter.email}</p>
                  )}
                  {deletingVoter.phone && (
                    <p className="text-slate-600 font-mono text-[11px]">SĐT: {deletingVoter.phone}</p>
                  )}
                  {deletingVoter.village && (
                    <p className="text-slate-600 text-[11px]">Địa bàn: {deletingVoter.village}</p>
                  )}
                </div>
              </div>

              {deletingVoter.feedbackCount > 0 && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteWithFeedbacks}
                    onChange={(e) => setDeleteWithFeedbacks(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold block">
                      Đồng thời xóa {deletingVoter.feedbackCount} ý kiến phản ánh do cử tri này gửi
                    </span>
                    <span className="text-[11px] text-amber-700 leading-tight block mt-0.5">
                      Chọn tùy chọn này nếu đây là tài khoản spam, cố tình gửi ý kiến rác làm nhiễu hệ thống.
                    </span>
                  </div>
                </label>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingVoter(null)}
                  disabled={isDeletingVoter}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVoter}
                  disabled={isDeletingVoter}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingVoter ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Xác nhận xóa tài khoản
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL XEM CHI TIẾT Ý KIẾN CỦA CỬ TRI */}
      {selectedVoterDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs uppercase">
                  Ý kiến đã gửi của cử tri: {selectedVoterDetail.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedVoterDetail(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {selectedVoterDetail.feedbacks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Cử tri chưa gửi ý kiến nào</p>
              ) : (
                selectedVoterDetail.feedbacks.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {f.ticketCode}
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          f.status === "Đã trả lời"
                            ? "bg-emerald-100 text-emerald-800"
                            : f.status === "Chờ duyệt"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-medium">{f.content}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Gửi lúc: {new Date(f.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVoterDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL QUẢN LÝ TÀI KHOẢN CÁN BỘ (ADMIN TOÀN QUYỀN ONLY) */}
      {showOfficerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-indigo-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-800/80 rounded-xl border border-indigo-600/50 shadow-inner">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base tracking-wide uppercase flex items-center gap-2">
                    QUẢN LÝ TÀI KHOẢN CÁN BỘ CÔNG VỤ
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Admin Toàn Quyền
                    </span>
                  </h3>
                  <p className="text-[11px] text-indigo-200 mt-0.5">
                    Đổi tên đăng nhập, đặt lại mật khẩu và quản lý quyền "Trả lời công vụ" của các đơn vị
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOfficerModal(false);
                  setEditingOfficer(null);
                  setShowAddOfficerForm(false);
                }}
                className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-800/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thân Modal */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Thông báo thao tác */}
              {officerNotice && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    officerNotice.success
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {officerNotice.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{officerNotice.msg}</span>
                  </div>
                  <button
                    onClick={() => setOfficerNotice(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* KHU VỰC CHỈNH SỬA TÀI KHOẢN CÁN BỘ ĐANG CHỌN */}
              {editingOfficer && (
                <div className="p-4 sm:p-5 bg-amber-50/90 border-2 border-amber-400 rounded-2xl shadow-md space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-amber-800" />
                      <h4 className="font-bold text-sm text-amber-950 uppercase">
                        Chỉnh sửa tài khoản: {editingOfficer.fullName}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingOfficer(null)}
                      className="text-amber-800 hover:text-amber-950 text-xs font-semibold px-2 py-1 rounded bg-amber-200/60 hover:bg-amber-200 cursor-pointer transition"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <form onSubmit={handleSaveOfficerSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tên hiển thị cán bộ */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Họ tên cán bộ phụ trách:
                        </label>
                        <input
                          type="text"
                          value={editOfficerFullName}
                          onChange={(e) => setEditOfficerFullName(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          placeholder="Ví dụ: Cán bộ Ban Chỉ huy Công an Xã Ea Súp"
                        />
                      </div>

                      {/* Cơ quan trực thuộc */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cơ quan ban hành / trả lời:
                        </label>
                        <select
                          value={editOfficerOrg}
                          onChange={(e) => setEditOfficerOrg(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
                        >
                          {ANSWERING_ORGS.map((org) => (
                            <option key={org} value={org}>
                              {org}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tên đăng nhập mới */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tên đăng nhập (Username):
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editOfficerUsername}
                            onChange={(e) => setEditOfficerUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                            required
                            className="w-full px-3 py-2 text-xs font-mono font-bold text-indigo-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            placeholder="mttq, ubnd, congan..."
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          * Tên đăng nhập viết thường, không dấu, không khoảng cách.
                        </p>
                      </div>

                      {/* Mật khẩu mới */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mật khẩu mới (Để trống nếu giữ nguyên mật khẩu cũ):
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type={showOfficerPassword ? "text" : "password"}
                            value={editOfficerPassword}
                            onChange={(e) => setEditOfficerPassword(e.target.value)}
                            className="w-full px-3 py-2 pr-16 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowOfficerPassword(!showOfficerPassword)}
                            className="absolute right-2 px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            {showOfficerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <button
                            type="button"
                            onClick={() => setEditOfficerPassword("12345678@")}
                            className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                          >
                            Đặt lại về mặc định (12345678@)
                          </button>
                          <span className="text-[10px] text-slate-500 italic">Tối thiểu 6 ký tự</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingOfficer(null)}
                        className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingOfficer}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer transition disabled:opacity-50"
                      >
                        {isSavingOfficer ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Lưu thay đổi tài khoản</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* KHU VỰC FORM THÊM MỚI TÀI KHOẢN CÁN BỘ */}
              {showAddOfficerForm && (
                <div className="p-4 sm:p-5 bg-indigo-50/80 border-2 border-indigo-300 rounded-2xl shadow-md space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-3">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-indigo-800" />
                      <h4 className="font-bold text-sm text-indigo-950 uppercase">
                        Thêm mới tài khoản cán bộ công vụ
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddOfficerForm(false)}
                      className="text-indigo-800 hover:text-indigo-950 text-xs font-semibold px-2 py-1 rounded bg-indigo-200/60 hover:bg-indigo-200 cursor-pointer transition"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <form onSubmit={handleCreateOfficerSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Họ tên cán bộ / chức vụ:
                        </label>
                        <input
                          type="text"
                          value={newOfficerFullName}
                          onChange={(e) => setNewOfficerFullName(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="Ví dụ: Cán bộ Ban Địa chính - Nông nghiệp"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cơ quan ban hành / trả lời:
                        </label>
                        <select
                          value={newOfficerOrg}
                          onChange={(e) => setNewOfficerOrg(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                        >
                          {ANSWERING_ORGS.map((org) => (
                            <option key={org} value={org}>
                              {org}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tên đăng nhập (Username):
                        </label>
                        <input
                          type="text"
                          value={newOfficerUsername}
                          onChange={(e) => setNewOfficerUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                          required
                          className="w-full px-3 py-2 text-xs font-mono font-bold text-indigo-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="diachinh, motcua..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mật khẩu đăng nhập:
                        </label>
                        <input
                          type="text"
                          value={newOfficerPassword}
                          onChange={(e) => setNewOfficerPassword(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="12345678@"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddOfficerForm(false)}
                        className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingOfficer}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer transition disabled:opacity-50"
                      >
                        {isSavingOfficer ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlusCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Tạo tài khoản cán bộ</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* THANH TÌM KIẾM VÀ NÚT THAO TÁC */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={officerSearch}
                    onChange={(e) => setOfficerSearch(e.target.value)}
                    placeholder="Tìm theo tên đăng nhập, cơ quan..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {officerSearch && (
                    <button
                      onClick={() => setOfficerSearch("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {!showAddOfficerForm && !editingOfficer && (
                    <button
                      onClick={() => setShowAddOfficerForm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Thêm tài khoản mới</span>
                    </button>
                  )}
                  <button
                    onClick={loadOfficers}
                    className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 cursor-pointer"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-4 h-4 ${officersLoading ? "animate-spin text-indigo-600" : ""}`} />
                  </button>
                </div>
              </div>

              {/* BẢNG DANH SÁCH TÀI KHOẢN CÁN BỘ */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {officersLoading ? (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-xs font-medium">Đang tải danh sách tài khoản cán bộ...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-3 text-center w-12">STT</th>
                        <th className="p-3">Cơ quan & Họ tên cán bộ</th>
                        <th className="p-3">Tên đăng nhập (Username)</th>
                        <th className="p-3">Quyền hạn công vụ</th>
                        <th className="p-3 text-center">Trạng thái</th>
                        <th className="p-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {officers
                        .filter((o) => {
                          if (!officerSearch.trim()) return true;
                          const q = officerSearch.toLowerCase();
                          return (
                            o.username?.toLowerCase().includes(q) ||
                            o.fullName?.toLowerCase().includes(q) ||
                            o.org?.toLowerCase().includes(q)
                          );
                        })
                        .map((off, idx) => (
                          <tr key={String(off.id)} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <p className="font-bold text-slate-900 text-xs">{off.fullName}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>{off.org || "Ủy ban MTTQ Việt Nam Xã Ea Súp"}</span>
                              </p>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md text-xs inline-block">
                                {off.username}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                <FileCheck className="w-3 h-3 text-emerald-600" />
                                Quyền Trả lời
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                                Hoạt động
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleStartEditOfficer(off)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 rounded-lg text-xs shadow-xs cursor-pointer transition"
                                title="Đổi tên đăng nhập hoặc mật khẩu"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Đổi tên / Mật khẩu</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-[11px] text-slate-500 italic">
                * Cán bộ sau khi được cấp/đổi tài khoản có thể đăng nhập ngay tại <span className="font-mono font-bold text-slate-700">/admin/login</span> với mật khẩu mới.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowOfficerModal(false);
                  setEditingOfficer(null);
                  setShowAddOfficerForm(false);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer shadow transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
