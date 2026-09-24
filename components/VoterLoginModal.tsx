"use client";

import React, { useState } from "react";
import { UserCheck, X, Phone, User, CheckCircle2, AlertCircle } from "lucide-react";

interface VoterLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (voter: { phone: string; fullName: string }) => void;
}

export default function VoterLoginModal({
  isOpen,
  onClose,
  onSuccess,
}: VoterLoginModalProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !fullName.trim()) {
      setError("Vui lòng nhập đầy đủ Số điện thoại và Họ tên cử tri");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/voter/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, fullName }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.voter);
        onClose();
      } else {
        setError(data.message || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      setError("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-tight">
              Đăng nhập Cử tri Xã Ea Súp
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed bg-blue-50 border border-blue-200 p-3 rounded-lg">
            Đăng nhập giúp cử tri được <strong>tích chọn đánh giá mức độ hài lòng</strong> đối với kết quả giải quyết ý kiến của các cơ quan chính quyền xã.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Họ và tên Cử tri <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Y Krông Niê hoặc Trần Văn A"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Số điện thoại cử tri <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912.xxx.xxx"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Số điện thoại dùng để ghi nhận đánh giá chính xác của bạn.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xác thực..." : "Xác nhận đăng nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
