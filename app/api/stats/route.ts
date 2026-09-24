import { NextResponse } from "next/server";
import { getFeedbackStats } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getFeedbackStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Lỗi lấy thống kê:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy số liệu thống kê" },
      { status: 500 }
    );
  }
}
