import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { respondFeedback } from "@/lib/data-store";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền thực hiện chức năng này" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { feedbackId, ticketCode, answeringOrg, responseContent, documentUrl } = body;

    if (!feedbackId || !answeringOrg) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn cơ quan ban hành trả lời",
        },
        { status: 400 }
      );
    }

    let finalContent = responseContent ? responseContent.trim() : "";
    const hasDoc = Boolean(documentUrl && documentUrl.trim().length > 0);

    if (!finalContent || finalContent.length < 2) {
      if (hasDoc) {
        finalContent = "Cơ quan có thẩm quyền đã ban hành văn bản giải quyết chính thức (chi tiết vui lòng xem tệp tài liệu, văn bản có dấu đỏ đính kèm bên dưới).";
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Vui lòng nhập nội dung văn bản giải quyết chi tiết hoặc đính kèm tệp văn bản / hình ảnh có dấu đỏ",
          },
          { status: 400 }
        );
      }
    }

    const response = await respondFeedback({
      feedbackId: Number(feedbackId),
      ticketCode: ticketCode ? String(ticketCode).trim() : undefined,
      answeringOrg: answeringOrg.trim(),
      responseContent: finalContent,
      documentUrl: documentUrl?.trim() || null,
      answeredBy: `${session.fullName || "Cán bộ"} (${session.username || "admin"})`,
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật văn bản trả lời cử tri và chuyển trạng thái 'Đã trả lời'",
      data: response,
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật trả lời:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi cập nhật văn bản trả lời" },
      { status: 500 }
    );
  }
}
