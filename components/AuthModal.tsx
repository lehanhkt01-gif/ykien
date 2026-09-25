"use client";

import React from "react";
import Image from "next/image";
import { X, ShieldCheck, UserCheck } from "lucide-react";
import GoogleSignInButton from "./GoogleSignInButton";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (voter: any) => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;

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
                src="/logo.png"
                alt="Logo MTTQ Việt Nam"
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                ỦY BAN MTTQ VIỆT NAM XÃ EA SÚP
              </p>
              <h3 className="font-bold text-base sm:text-lg leading-tight text-white mt-0.5">
                Đăng nhập Cổng thông tin Cử tri
              </h3>
            </div>
          </div>
        </div>

        {/* Thân Modal: Đăng nhập bằng Google */}
        <div className="p-6 space-y-5">
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p className="font-semibold text-amber-950 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-red-700 flex-shrink-0" />
              Kính chào Bà con Cử tri xã Ea Súp!
            </p>
            Bà con cử tri vui lòng đăng nhập bằng tài khoản <strong>Google (Gmail)</strong> có sẵn trên thiết bị để gửi ý kiến phản ánh và theo dõi tiến độ giải quyết của cơ quan thẩm quyền.
          </div>

          {/* Nút bấm Google 1 chạm */}
          <div className="pt-1">
            <GoogleSignInButton text="Tiếp tục bằng tài khoản Google" />
          </div>

          {/* Cam kết bảo mật thông tin cá nhân của công dân */}
          <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-normal">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              Hệ thống cam kết bảo mật tuyệt đối danh tính và thông tin cá nhân của cử tri theo đúng quy định của pháp luật.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
