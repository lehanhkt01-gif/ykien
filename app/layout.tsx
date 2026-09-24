import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "TIẾNG NÓI CỬ TRI - Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương | Xã Ea Súp",
  description: "Trang thông tin điện tử phục vụ cử tri và nhân dân theo dõi, tra cứu kết quả giải quyết ý kiến phản ánh của chính quyền Xã Ea Súp, Tỉnh Đắk Lắk.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
