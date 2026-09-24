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
    const { feedbackId, answeringOrg, responseContent, documentUrl } = body;

    if (!feedbackId || !answeringOrg || !responseContent || responseContent.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn cơ quan trả lời và nhập nội dung giải quyết chi tiết",
        },
        { status: 400 }
      );
    }

    const response = await respondFeedback({
      feedbackId: Number(feedbackId),
      answeringOrg: answeringOrg.trim(),
      responseContent: responseContent.trim(),
      documentUrl: documentUrl?.trim() || null,
      answeredBy: `${session.fullName} (${session.username})`,
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
