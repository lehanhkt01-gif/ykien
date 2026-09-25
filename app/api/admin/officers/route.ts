import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getOfficerAccounts,
  updateOfficerAccount,
  createOfficerAccount,
} from "@/lib/data-store";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy danh sách tài khoản cán bộ công vụ (chỉ Quản trị viên ADMIN toàn quyền)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên toàn quyền." },
        { status: 403 }
      );
    }

    const officers = await getOfficerAccounts();
    return NextResponse.json({
      success: true,
      total: officers.length,
      officers,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách cán bộ:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi máy chủ khi lấy danh sách cán bộ" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Cập nhật tên đăng nhập, mật khẩu, thông tin cán bộ
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên toàn quyền." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, username, password, fullName, org, active } = body;

    if (!id || !username) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID hoặc Tên đăng nhập cán bộ" },
        { status: 400 }
      );
    }

    const updated = await updateOfficerAccount({
      id,
      username,
      password: password || undefined,
      fullName: fullName || undefined,
      org: org || undefined,
      active: active !== undefined ? Boolean(active) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Cập nhật tài khoản cán bộ "${updated.username}" thành công!`,
      officer: updated,
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật cán bộ:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi cập nhật tài khoản cán bộ" },
      { status: 400 }
    );
  }
}

/**
 * POST: Tạo mới tài khoản cán bộ công vụ
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên toàn quyền." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, fullName, org } = body;

    if (!username || !fullName || !org) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ Tên đăng nhập, Họ tên và Đơn vị" },
        { status: 400 }
      );
    }

    const created = await createOfficerAccount({
      username,
      password: password || undefined,
      fullName,
      org,
    });

    return NextResponse.json({
      success: true,
      message: `Tạo tài khoản cán bộ "${created.username}" thành công!`,
      officer: created,
    });
  } catch (error: any) {
    console.error("Lỗi tạo mới cán bộ:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi tạo mới tài khoản cán bộ" },
      { status: 400 }
    );
  }
}
