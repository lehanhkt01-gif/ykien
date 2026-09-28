import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateFeedback } from "@/lib/data-store";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    let voterPhone = "";
    let voterEmail = "";
    let voterName = "";
    let isVoter = false;

    // 1. Kiểm tra session Google OAuth
    const session = await auth();
    if (session?.user) {
      isVoter = true;
      voterName = session.user.name || "Cử tri Ea Súp";
      voterPhone = session.user.phone || "";
      voterEmail = session.user.email || "";
      if (!voterPhone && !voterEmail) {
        voterPhone = session.user.id || "google_user";
      }
    } else {
      // 2. Kiểm tra session SĐT cũ
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("easup_voter_session");
      if (sessionCookie && sessionCookie.value) {
        try {
          const voter = JSON.parse(sessionCookie.value);
          isVoter = true;
          voterName = voter.fullName || "Cử tri Ea Súp";
          voterPhone = voter.phone || "";
          voterEmail = voter.email || "";
        } catch (e) {}
      }
    }

    if (!isVoter || (!voterPhone && !voterEmail)) {
      return NextResponse.json(
        { success: false, message: "Chỉ có cử tri mới được quyền đánh giá. Vui lòng đăng nhập Cử tri!" },
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
      voterEmail,
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
