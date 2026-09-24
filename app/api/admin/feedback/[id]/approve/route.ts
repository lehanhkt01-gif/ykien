import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveFeedback } from "@/lib/data-store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập tài khoản quản trị" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const updated = await approveFeedback(Number(id));
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy hồ sơ ý kiến" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã duyệt tiếp nhận ý kiến thành công! Hồ sơ đã được công khai trên hệ thống.",
      item: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi duyệt hồ sơ" },
      { status: 500 }
    );
  }
}
