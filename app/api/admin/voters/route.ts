import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getVotersList, deleteVoterAccount } from "@/lib/data-store";

export const dynamic = "force-dynamic";

/**
 * Lấy danh sách cử tri đã đăng nhập (Google OAuth / SĐT) và tương tác với hệ thống
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Yêu cầu đăng nhập quản trị viên" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const voters = await getVotersList(search);
    return NextResponse.json({
      success: true,
      total: voters.length,
      voters,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách cử tri:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi máy chủ khi lấy danh sách cử tri" },
      { status: 500 }
    );
  }
}

/**
 * Xóa tài khoản cử tri rác, spam hoặc tài khoản cử tri không hợp lệ
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Yêu cầu đăng nhập quản trị viên" }, { status: 401 });
    }

    const body = await req.json();
    const { id, email, phone, deleteFeedbacks } = body;

    const targetKey = id || email || phone;
    if (!targetKey) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin nhận diện tài khoản cử tri cần xóa" },
        { status: 400 }
      );
    }

    const result = await deleteVoterAccount(targetKey, Boolean(deleteFeedbacks));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Lỗi xóa cử tri:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi xóa cử tri" },
      { status: 400 }
    );
  }
}
