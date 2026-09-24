import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createFeedback, respondFeedback } from "@/lib/data-store";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập tài khoản quản trị" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      voterName,
      phone,
      village,
      category,
      content,
      status,
      answeringOrg,
      responseContent,
      documentUrl,
      answeredBy,
    } = body;

    if (!content || !village || !category) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ thôn buôn, lĩnh vực và nội dung" },
        { status: 400 }
      );
    }

    const item = await createFeedback({
      voterName: voterName?.trim() || "Cử tri Ea Súp",
      phone: phone?.trim() || null,
      village,
      category,
      content: content.trim(),
      isAnonymous: !voterName?.trim(),
    });

    if (responseContent?.trim() && status === "Đã trả lời") {
      await respondFeedback({
        feedbackId: item.id,
        answeringOrg: answeringOrg || "Ủy ban Nhân dân xã Ea Súp",
        responseContent: responseContent.trim(),
        documentUrl: documentUrl?.trim() || null,
        answeredBy: answeredBy?.trim() || session.fullName,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Thêm hồ sơ ý kiến cử tri thành công",
      item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo hồ sơ" },
      { status: 500 }
    );
  }
}
