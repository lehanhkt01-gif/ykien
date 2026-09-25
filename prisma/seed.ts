import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { initialFeedbacks } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu cho hệ thống Xã Ea Súp...");

  // 1. Tạo tài khoản quản trị lehanhkt01 duy nhất
  const adminPasswordHash = await bcrypt.hash("Hh@$123456", 10);
  await prisma.user.deleteMany({
    where: { username: { in: ["admin", "lehanh"] } },
  });

  const admin = await prisma.user.upsert({
    where: { username: "lehanhkt01" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
    },
    create: {
      username: "lehanhkt01",
      passwordHash: adminPasswordHash,
      fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
      role: "ADMIN",
      active: true,
    },
  });

  console.log(`Đã tạo/cập nhật tài khoản Quản trị viên: ${admin.username}`);

  // 2. Dọn dẹp các ý kiến test cũ khỏi CSDL
  const testCodes = [
    "EASUP-PA-892415",
    "EASUP-PA-671239",
    "EASUP-PA-452108",
    "EASUP-PA-319874",
    "EASUP-PA-208915",
    "EASUP-PA-110293",
  ];
  await prisma.voterFeedback.deleteMany({
    where: { ticketCode: { in: testCodes } },
  });

  // 3. Nạp dữ liệu các ý kiến cử tri và văn bản trả lời (nếu có trong seed-data)
  for (const item of initialFeedbacks) {
    const feedback = await prisma.voterFeedback.upsert({
      where: { ticketCode: item.ticketCode },
      update: {},
      create: {
        ticketCode: item.ticketCode,
        voterName: item.voterName,
        phone: item.phone,
        village: item.village,
        category: item.category,
        content: item.content,
        status: item.status,
        createdAt: item.createdAt,
        officialResponse: item.response
          ? {
              create: {
                answeringOrg: item.response.answeringOrg,
                responseContent: item.response.responseContent,
                documentUrl: item.response.documentUrl,
                answeredBy: item.response.answeredBy,
                answeredAt: item.response.answeredAt,
              },
            }
          : undefined,
      },
    });

    console.log(`Đã nạp hồ sơ: ${feedback.ticketCode} - ${feedback.voterName}`);
  }

  console.log("✅ Nạp dữ liệu hoàn tất thành công!");
}

main()
  .catch((e) => {
    console.error("Lỗi khi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
