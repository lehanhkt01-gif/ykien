import { NextRequest, NextResponse } from "next/server";
import { getFeedbacksList, createFeedback } from "@/lib/data-store";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || undefined;
    const village = searchParams.get("village") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const session = await getSession();
    // BẮT BUỘC: Chỉ khi request đến từ giao diện Cán bộ (/admin) có tham số admin=true VÀ có session cán bộ
    // thì mới được xem hồ sơ chờ duyệt.
    // Tại giao diện Trang chủ, Khách xem, Cử tri đăng nhập (/): isAdmin luôn là false, hồ sơ chưa duyệt KHÔNG BAO GIỜ xuất hiện.
    const isAdmin = Boolean(session && searchParams.get("admin") === "true");

    const data = await getFeedbacksList({
      page,
      limit,
      search,
      village,
      category,
      status,
      fromDate,
      toDate,
      isAdmin,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách phản ánh:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy danh sách phản ánh cử tri" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voterName, phone, village, category, content, attachments } = body;

    if (!village || !category || !content || content.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn Thôn/Buôn, Lĩnh vực và nhập nội dung ít nhất 10 ký tự",
        },
        { status: 400 }
      );
    }

    const newFeedback = await createFeedback({
      voterName,
      phone,
      village,
      category,
      content,
      status: "Chờ duyệt",
      isApproved: false,
      attachments: Array.isArray(attachments) ? attachments : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Gửi phản ánh kiến nghị thành công! Ý kiến đang chờ cán bộ duyệt trước khi công khai.",
      data: newFeedback,
    });
  } catch (error: any) {
    console.error("Lỗi tạo phản ánh:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi tiếp nhận phản ánh" },
      { status: 500 }
    );
  }
}
