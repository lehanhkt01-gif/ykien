import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateFeedback } from "@/lib/data-store";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    let voterPhone = "";
    let voterName = "";

    // 1. Kiểm tra session Google OAuth
    const session = await auth();
    if (session?.user) {
      voterName = session.user.name || "Cử tri Ea Súp";
      voterPhone = session.user.phone || session.user.email || session.user.id || "google_user";
    } else {
      // 2. Kiểm tra session SĐT cũ
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("easup_voter_session");
      if (sessionCookie && sessionCookie.value) {
        try {
          const voter = JSON.parse(sessionCookie.value);
          voterName = voter.fullName;
          voterPhone = voter.phone;
        } catch (e) {}
      }
    }

    if (!voterPhone) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập Cử tri để thực hiện đánh giá kết quả" },
        { status: 401 }
      );
    }

    const { feedbackId, rating } = await req.json();

    if (!feedbackId || !rating) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin đánh giá" },
        { status: 400 }
      );
    }

    if (!["Rất hài lòng", "Hài lòng", "Chưa hài lòng"].includes(rating)) {
      return NextResponse.json(
        { success: false, message: "Mức độ đánh giá không hợp lệ" },
        { status: 400 }
      );
    }

    const result = await rateFeedback({
      feedbackId: Number(feedbackId),
      voterPhone,
      voterName,
      rating,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Lỗi đánh giá cử tri:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi lưu đánh giá" },
      { status: 500 }
    );
  }
}
