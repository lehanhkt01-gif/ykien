import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getVoterRatings } from "@/lib/data-store";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Kiểm tra session NextAuth (Google OAuth)
    const session = await auth();
    if (session?.user) {
      let dbVillage = session.user.village || "";
      let dbPhone = session.user.phone || "";

      // Thử lấy thêm thông tin cập nhật mới nhất từ CSDL nếu có
      try {
        if (session.user.id || session.user.email) {
          const dbUser = await prisma.user.findFirst({
            where: session.user.id
              ? { id: session.user.id }
              : { email: session.user.email! },
          });
          if (dbUser) {
            if (dbUser.village) dbVillage = dbUser.village;
            if (dbUser.phone) dbPhone = dbUser.phone;
          }
        }
      } catch (e) {}

      const voter = {
        id: session.user.id,
        fullName: session.user.name || "Cử tri Ea Súp",
        email: session.user.email,
        image: session.user.image,
        phone: dbPhone,
        village: dbVillage,
        role: "Cử tri",
        isGoogle: true,
      };

      const ratings = voter.phone ? await getVoterRatings(voter.phone) : {};

      return NextResponse.json({
        success: true,
        isLoggedIn: true,
        voter,
        ratings,
      });
    }

    // 2. Fallback session cũ theo cookie số điện thoại
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("easup_voter_session");

    if (sessionCookie && sessionCookie.value) {
      try {
        const voter = JSON.parse(sessionCookie.value);
        const ratings = await getVoterRatings(voter.phone);

        return NextResponse.json({
          success: true,
          isLoggedIn: true,
          voter: { ...voter, isGoogle: false },
          ratings,
        });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      isLoggedIn: false,
      voter: null,
      ratings: {},
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      isLoggedIn: false,
      voter: null,
      ratings: {},
    });
  }
}
