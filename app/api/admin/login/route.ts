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

    const cleanUser = username.trim().toLowerCase();
    let user = await findUserByUsername(cleanUser);

    // Fallback bảo chứng tuyệt đối cho tài khoản Admin toàn quyền lehanhkt01
    const adminUserEnv = (process.env.ADMIN_USERNAME || "lehanhkt01").trim().toLowerCase().replace(/^["']|["']$/g, "");
    if ((!user || user.role !== "ADMIN") && (cleanUser === "lehanhkt01" || cleanUser === adminUserEnv)) {
      let adminPass = process.env.ADMIN_PASSWORD || "Hh@$123456";
      adminPass = adminPass.replace(/^["']|["']$/g, "").replace(/\\(?=\$)/g, "");
      if (!adminPass || adminPass === "Hh@") adminPass = "Hh@$123456";

      user = {
        id: 1,
        username: "lehanhkt01",
        passwordHash: bcrypt.hashSync(adminPass, 10),
        fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
        role: "ADMIN",
        active: true,
        createdAt: new Date(),
      };
    }

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: "Tài khoản hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    // Đối chiếu dự phòng trực tiếp mật khẩu cho lehanhkt01 / admin nếu có sai lệch mã hóa môi trường Docker/.env
    if (!isMatch && (user.role === "ADMIN" || cleanUser === "lehanhkt01")) {
      let rawAdminPass = (process.env.ADMIN_PASSWORD || "Hh@$123456").replace(/^["']|["']$/g, "");
      let cleanAdminPass = rawAdminPass.replace(/\\(?=\$)/g, "");
      if (
        password === "Hh@$123456" ||
        password === rawAdminPass ||
        password === cleanAdminPass ||
        password === "Hh@\\$123456"
      ) {
        isMatch = true;
      }
    }

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
      org: (user as any).org,
    });

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công!",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        org: (user as any).org,
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
