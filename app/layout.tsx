import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://ykien.easupso.com"),
  title: "TIẾNG NÓI CỬ TRI - Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương | Xã Ea Súp",
  description: "Trang thông tin điện tử phục vụ cử tri và nhân dân theo dõi, tra cứu kết quả giải quyết ý kiến phản ánh của Ủy ban Mặt trận Tổ quốc và Chính quyền Xã Ea Súp.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "TIẾNG NÓI CỬ TRI - Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương | Xã Ea Súp",
    description: "Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương - Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp.",
    url: "https://ykien.easupso.com",
    siteName: "Tiếng Nói Cử Tri - Xã Ea Súp",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "TIẾNG NÓI CỬ TRI - Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIẾNG NÓI CỬ TRI - Cầu nối số minh bạch giữa Cử tri và Chính quyền địa phương",
    description: "Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp",
    images: ["/preview.png"],
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
