import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// Cấu hình giới hạn
const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Định dạng tệp cho phép
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream", // Fallback cho một số trình duyệt khi gửi doc/docx
]);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tệp đính kèm nào được tải lên" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `Chỉ được đính kèm tối đa ${MAX_FILES} tệp tin` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const savedFiles = [];

    for (const file of files) {
      if (typeof file === "string" || !file.name) continue;

      // 1. Kiểm tra kích thước <= 5MB
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `Tệp "${file.name}" vượt quá dung lượng cho phép (tối đa 5MB/tệp)`,
          },
          { status: 400 }
        );
      }

      // 2. Kiểm tra định dạng đuôi tệp
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          {
            success: false,
            message: `Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận các tệp hình ảnh (JPG, PNG, WEBP), PDF hoặc Word (DOC, DOCX).`,
          },
          { status: 400 }
        );
      }

      // 3. Đọc dữ liệu và lưu vào public/uploads
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Tạo tên tệp an toàn không dấu
      const cleanOriginalName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const savedFileName = `${uniqueSuffix}_${cleanOriginalName}`;
      const filePath = path.join(uploadDir, savedFileName);

      await fs.writeFile(filePath, buffer);

      // Xác định loại tệp để hiển thị UI
      let categoryType = "other";
      if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
        categoryType = "image";
      } else if (ext === ".pdf") {
        categoryType = "pdf";
      } else if ([".doc", ".docx"].includes(ext)) {
        categoryType = "word";
      }

      savedFiles.push({
        name: file.name,
        url: `/uploads/${savedFileName}`,
        size: file.size,
        type: categoryType,
        ext,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã tải lên thành công ${savedFiles.length} tệp tin`,
      files: savedFiles,
    });
  } catch (error: any) {
    console.error("Lỗi khi tải tệp lên:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi máy chủ khi xử lý tải tệp" },
      { status: 500 }
    );
  }
}
