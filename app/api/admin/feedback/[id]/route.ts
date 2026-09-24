import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateFeedback, deleteFeedback } from "@/lib/data-store";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập tài khoản quản trị" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await updateFeedback(Number(id), body);
    return NextResponse.json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
      item: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi cập nhật hồ sơ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập tài khoản quản trị" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    await deleteFeedback(Number(id));

    return NextResponse.json({
      success: true,
      message: "Đã xóa hồ sơ ý kiến thành công",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi khi xóa hồ sơ" },
      { status: 500 }
    );
  }
}
