import { NextRequest, NextResponse } from "next/server";
import { getFeedbackById } from "@/lib/data-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedback = await getFeedbackById(id);

    if (!feedback) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy hồ sơ phản ánh" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi truy vấn hồ sơ" },
      { status: 500 }
    );
  }
}
