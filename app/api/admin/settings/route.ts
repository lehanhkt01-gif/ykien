import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllSettings, setSystemSetting } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu quyền Quản trị viên" },
      { status: 401 }
    );
  }

  try {
    const settings = await getAllSettings();
    return NextResponse.json({
      success: true,
      settings: {
        CHATBOT_API_KEY: settings.CHATBOT_API_KEY || "",
        CHATBOT_MODEL: settings.CHATBOT_MODEL || "gemini-2.5-flash",
        SYSTEM_PROMPT: settings.SYSTEM_PROMPT || "",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi lấy cấu hình" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu quyền Quản trị viên" },
      { status: 401 }
    );
  }

  try {
    const { CHATBOT_API_KEY, CHATBOT_MODEL, SYSTEM_PROMPT } = await req.json();

    if (CHATBOT_API_KEY !== undefined) {
      await setSystemSetting("CHATBOT_API_KEY", CHATBOT_API_KEY.trim(), "Google Gemini AI API Key");
    }

    if (CHATBOT_MODEL !== undefined) {
      await setSystemSetting("CHATBOT_MODEL", CHATBOT_MODEL.trim(), "AI Model Name");
    }

    if (SYSTEM_PROMPT !== undefined) {
      await setSystemSetting("SYSTEM_PROMPT", SYSTEM_PROMPT.trim(), "Chỉ dẫn hệ thống cho Chatbot");
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật cấu hình Trợ lý AI Chatbot thành công",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi lưu cấu hình" },
      { status: 500 }
    );
  }
}
