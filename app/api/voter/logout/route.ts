import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Đã đăng xuất cử tri",
  });

  res.cookies.set("easup_voter_session", "", {
    httpOnly: false,
    maxAge: 0,
    path: "/",
  });

  return res;
}
