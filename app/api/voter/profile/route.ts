import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { saveVoterAccount } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { village, phone, fullName } = body;

    // 1. Kiểm tra session NextAuth (Google OAuth)
    const session = await auth();
    if (session?.user) {
      try {
        if (session.user.id) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: {
              village: village || undefined,
              phone: phone || undefined,
              name: fullName || undefined,
            },
          });
        } else if (session.user.email) {
          await prisma.user.update({
            where: { email: session.user.email },
            data: {
              village: village || undefined,
              phone: phone || undefined,
              name: fullName || undefined,
            },
          });
        }
      } catch (dbErr) {
        // Fallback an toàn nếu PostgreSQL local không online
      }

      // Lưu bền vững vào users store
      try {
        await saveVoterAccount({
          email: session.user.email || null,
          phone: phone || null,
          name: fullName || session.user.name || undefined,
          village: village || null,
          image: session.user.image || null,
        });
      } catch (err) {}

      return NextResponse.json({
        success: true,
        message: "Cập nhật thông tin cử tri thành công!",
        data: { village, phone, fullName },
      });
    }

    // 2. Fallback nếu cử tri đăng nhập bằng SĐT session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("easup_voter_session");
    if (sessionCookie?.value) {
      const voter = JSON.parse(sessionCookie.value);
      const updatedVoter = {
        ...voter,
        village: village || voter.village,
        phone: phone || voter.phone,
        fullName: fullName || voter.fullName,
      };
      cookieStore.set("easup_voter_session", JSON.stringify(updatedVoter), {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });

      return NextResponse.json({
        success: true,
        message: "Cập nhật thông tin thành công!",
        data: updatedVoter,
      });
    }

    return NextResponse.json(
      { success: false, message: "Vui lòng đăng nhập trước khi cập nhật" },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật thông tin" },
      { status: 500 }
    );
  }
}
