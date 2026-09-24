import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByUsername } from "@/lib/data-store";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username.trim());
    if (!user || !user.active || !user.passwordHash) {
      return NextResponse.json(
        { success: false, message: "Tài khoản hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Tài khoản hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      username: user.username || username.trim(),
      fullName: user.fullName || user.name || "Cán bộ quản trị",
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });

    const isHttps = req.nextUrl.protocol === "https:";

    // Cấp HttpOnly Cookie bảo mật
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return response;
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xử lý đăng nhập" },
      { status: 500 }
    );
  }
}
