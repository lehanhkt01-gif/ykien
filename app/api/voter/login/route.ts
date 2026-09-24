import { NextResponse } from "next/server";
import { saveVoterAccount } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const { phone, fullName } = await req.json();

    if (!phone || !phone.trim() || !fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ Số điện thoại và Họ tên cử tri" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/[^0-9+]/g, "");
    const cleanName = fullName.trim();

    // Lưu vào hệ thống quản lý cử tri
    try {
      await saveVoterAccount({
        phone: cleanPhone,
        name: cleanName,
      });
    } catch (saveErr) {}

    const voterData = {
      phone: cleanPhone,
      fullName: cleanName,
      loggedInAt: new Date().toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      message: "Đăng nhập cử tri thành công",
      voter: voterData,
    });

    res.cookies.set("easup_voter_session", JSON.stringify(voterData), {
      httpOnly: false, // Để client đọc được tên cử tri hiển thị trên UI
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 ngày
      path: "/",
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi đăng nhập cử tri" },
      { status: 500 }
    );
  }
}
