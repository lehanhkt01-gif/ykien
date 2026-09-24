"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, MapPin, Phone, User, CheckCircle2, Loader2, Save } from "lucide-react";
import { VILLAGES } from "@/lib/constants";

interface VoterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  voter: {
    fullName?: string;
    email?: string;
    image?: string;
    phone?: string;
    village?: string;
  } | null;
  onUpdateSuccess: (updated: { village: string; phone: string; fullName: string }) => void;
}

export default function VoterProfileModal({
  isOpen,
  onClose,
  voter,
  onUpdateSuccess,
}: VoterProfileModalProps) {
  const [village, setVillage] = useState(voter?.village || VILLAGES[0]);
  const [phone, setPhone] = useState(voter?.phone || "");
  const [fullName, setFullName] = useState(voter?.fullName || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen || !voter) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/voter/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ village, phone: phone.trim(), fullName: fullName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Đã cập nhật thông tin thành công!" });
        onUpdateSuccess({ village, phone: phone.trim(), fullName: fullName.trim() });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setMsg({ type: "error", text: data.message || "Không thể cập nhật" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: "Lỗi kết nối máy chủ" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base uppercase">Cập nhật thông tin Cử tri</h3>
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white transition cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avatar & Email */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {voter.image ? (
              <img
                src={voter.image}
                alt={voter.fullName || "Avatar"}
                className="w-12 h-12 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-lg">
                {(voter.fullName || "CT").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 text-sm truncate">{voter.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{voter.email || "Đăng nhập Google"}</p>
            </div>
          </div>

          {msg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                msg.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {msg.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Họ và tên Cử tri:
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên cử tri"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Thuộc Thôn / Buôn (xã Ea Súp):
            </label>
            <select
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
            >
              {VILLAGES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Giúp hệ thống tự động điền Thôn/Buôn mỗi khi bà con gửi ý kiến mới.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Số điện thoại liên hệ:
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ví dụ: 0912.xxx.xxx"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Để cơ quan chức năng liên hệ xác minh hiện trường khi giải quyết kiến nghị.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu thông tin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
