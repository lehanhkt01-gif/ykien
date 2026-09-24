"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, User, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/admin");
      } else {
        setErrorMsg(data.message || "Tài khoản hoặc mật khẩu không chính xác");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Nút quay lại trang chủ */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition mb-6 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Cổng thông tin Cử tri
        </Link>

        {/* Header form */}
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto bg-white p-2 rounded-full shadow-xl border-2 border-amber-400">
            <Image
              src="/logo.png"
              alt="Quốc huy - Logo Xã Ea Súp"
              fill
              className="object-contain p-1"
              priority
            />
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            HỆ THỐNG QUẢN TRỊ CÔNG VỤ
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-red-200">
            Cổng tiếp nhận & Thụ lý Ý kiến Cử tri Xã Ea Súp
          </p>
        </div>

        {/* Card Đăng nhập */}
        <div className="mt-6 bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/20">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form chuẩn hóa hoàn toàn cho Bitwarden / Password Managers */}
          <form onSubmit={handleSubmit} method="post" className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Tên đăng nhập cán bộ
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập (ví dụ: admin)"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-red-600 focus:outline-none focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Mật khẩu xác thực
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu công vụ"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-red-600 focus:outline-none focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Mã hóa JWT & Bcrypt 256-bit
              </span>
              <span className="text-amber-700 font-medium">Hỗ trợ Bitwarden (Ctrl+Shift+L)</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Đang xác thực bảo mật..." : "Đăng nhập Hệ thống"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
