"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, ShieldCheck, Phone, Mail, ArrowRight, UserCheck, CheckCircle2 } from "lucide-react";
import GoogleSignInButton from "./GoogleSignInButton";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (voter: any) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"google" | "phone">("google");
  
  // State đăng nhập bằng số điện thoại truyền thống (dành cho người lớn tuổi)
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
      setErrorMsg("Số điện thoại không hợp lệ (cần từ 9 - 11 chữ số)");
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Vui lòng nhập họ và tên của bà con cử tri");
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await fetch("/api/voter/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, fullName: fullName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (onLoginSuccess) onLoginSuccess(data.voter);
        onClose();
        window.location.reload();
      } else {
        setErrorMsg(data.message || "Không thể đăng nhập");
      }
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col transition-all">
        {/* Header Modal - Phong cách trang trọng cơ quan Mặt trận */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-red-800 text-white px-6 py-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-red-200 hover:text-white transition p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-300 shadow-md bg-white flex-shrink-0 flex items-center justify-center">
              <Image
                src="/images/logo-mttq.png"
                alt="Logo MTTQ Ea Súp"
                width={48}
                height={48}
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
              </p>
              <h3 className="font-bold text-base sm:text-lg leading-tight text-white mt-0.5">
                Đăng nhập Cổng thông tin Dân nguyện
              </h3>
            </div>
          </div>
        </div>

        {/* Thân Modal */}
        <div className="p-6 space-y-5">
          {authMode === "google" ? (
            /* CHẾ ĐỘ 1: ĐĂNG NHẬP 1 CHẠM BẰNG GOOGLE (MẶC ĐỊNH) */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-red-700 flex-shrink-0" />
                  Kính chào Bà con Cử tri xã Ea Súp!
                </p>
                Bà con cử tri vui lòng đăng nhập bằng tài khoản <strong>Google (Gmail)</strong> có sẵn trên máy để gửi ý kiến và theo dõi kết quả giải quyết.
              </div>

              {/* Nút bấm Google lớn */}
              <div className="pt-1">
                <GoogleSignInButton text="Tiếp tục bằng tài khoản Google" />
              </div>

              {/* Tùy chọn đăng nhập bằng SĐT */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  hoặc
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAuthMode("phone")}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Đăng nhập bằng Số điện thoại (Dành cho người không có Gmail)
              </button>
            </div>
          ) : (
            /* CHẾ ĐỘ 2: ĐĂNG NHẬP BẰNG SỐ ĐIỆN THOẠI */
            <form onSubmit={handlePhoneSubmit} className="space-y-3.5">
              <div className="text-xs text-slate-600">
                Nhập họ tên và số điện thoại của bà con để hệ thống nhận diện và ghi nhận đánh giá:
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                  {errorMsg}
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
                  placeholder="Ví dụ: Y Krông Niê / Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại di động:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0912.xxx.xxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{phoneLoading ? "Đang xác thực..." : "Xác nhận đăng nhập"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("google")}
                  className="text-xs text-red-700 hover:text-red-900 font-semibold hover:underline cursor-pointer"
                >
                  ← Quay lại Đăng nhập bằng Google
                </button>
              </div>
            </form>
          )}

          {/* Cam kết bảo mật thông tin cá nhân của công dân */}
          <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-normal">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              Hệ thống cam kết bảo mật tuyệt đối danh tính và thông tin cá nhân của cử tri theo quy định của pháp luật.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
