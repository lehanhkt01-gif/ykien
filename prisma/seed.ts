import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { initialFeedbacks } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu cho hệ thống Xã Ea Súp...");

  // 1. Tạo tài khoản quản trị
  const adminPasswordHash = await bcrypt.hash("Admin@EaSup2026!", 10);
  const officerPasswordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      fullName: "Quản Trị Viên Hệ Thống HĐND/UBND",
      role: "ADMIN",
      active: true,
    },
  });

  const officer = await prisma.user.upsert({
    where: { username: "lehanh" },
    update: {},
    create: {
      username: "lehanh",
      passwordHash: officerPasswordHash,
      fullName: "Lê Hạnh - Cán bộ Ban Thường trực MTTQ",
      role: "OFFICER",
      active: true,
    },
  });

  console.log(`Đã tạo người dùng: ${admin.username}, ${officer.username}`);

  // 2. Nạp dữ liệu các ý kiến cử tri và văn bản trả lời
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
