import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string[] }> }
) {
  try {
    const { filename } = await context.params;
    if (!filename || filename.length === 0) {
      return new NextResponse("Tên tệp không hợp lệ", { status: 400 });
    }

    const rawPath = Array.isArray(filename) ? filename.join("/") : filename;
    const decodedPath = decodeURIComponent(rawPath);

    // Kiểm tra và bảo vệ chống Path Traversal
    const baseUploadsDir = path.resolve(process.cwd(), "public", "uploads");
    let resolvedPath = path.resolve(baseUploadsDir, decodedPath);

    if (!resolvedPath.startsWith(baseUploadsDir)) {
      return new NextResponse("Truy cập bị từ chối", { status: 403 });
    }

    // Nếu không thấy trong public/uploads, thử kiểm tra thư mục uploads ở root
    if (!fs.existsSync(resolvedPath)) {
      const altDir = path.resolve(process.cwd(), "uploads");
      const altPath = path.resolve(altDir, decodedPath);
      if (altPath.startsWith(altDir) && fs.existsSync(altPath)) {
        resolvedPath = altPath;
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse("Tệp tin không tồn tại hoặc đã bị xóa", { status: 404 });
    }

    const stat = await fsp.stat(resolvedPath);
    if (!stat.isFile()) {
      return new NextResponse("Yêu cầu không phải là tệp tin", { status: 400 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileBuffer = await fsp.readFile(resolvedPath);

    const baseName = path.basename(resolvedPath);
    // Với PDF và Ảnh -> hiển thị trực tiếp (inline); với Word/Excel/Khác -> tải về (attachment)
    const isInline =
      contentType.startsWith("image/") ||
      contentType === "application/pdf" ||
      contentType.startsWith("text/");

    const dispositionType = isInline ? "inline" : "attachment";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(baseName)}"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error: any) {
    console.error("Lỗi khi phục vụ tệp đính kèm:", error);
    return new NextResponse("Lỗi máy chủ nội bộ khi đọc tệp", { status: 500 });
  }
}
