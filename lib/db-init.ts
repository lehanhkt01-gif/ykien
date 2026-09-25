import { prisma } from "./prisma";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { initialFeedbacks } from "../prisma/seed-data";

let isDbInitialized = false;

/**
 * Tự động tạo cấu trúc bảng CSDL PostgreSQL (nếu chưa có)
 * và tự động nạp dữ liệu ban đầu từ feedbacks.json/seed-data.
 * Đảm bảo hệ thống hoạt động ngay trong Docker mà không cần chạy thủ công `prisma db push`!
 */
export async function ensureDatabaseSchema() {
  if (isDbInitialized) return true;

  try {
    // 1. Tự động tạo toàn bộ bảng trong PostgreSQL nếu chưa có
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VoterFeedback" (
        "id" SERIAL PRIMARY KEY,
        "ticketCode" TEXT UNIQUE NOT NULL,
        "voterName" TEXT DEFAULT 'Cử tri ẩn danh' NOT NULL,
        "phone" TEXT,
        "village" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "status" TEXT DEFAULT 'Đã tiếp nhận' NOT NULL,
        "ratingVerySatisfied" INTEGER DEFAULT 0 NOT NULL,
        "ratingSatisfied" INTEGER DEFAULT 0 NOT NULL,
        "ratingUnsatisfied" INTEGER DEFAULT 0 NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OfficialResponse" (
        "id" SERIAL PRIMARY KEY,
        "feedbackId" INTEGER UNIQUE NOT NULL REFERENCES "VoterFeedback"("id") ON DELETE CASCADE,
        "answeringOrg" TEXT NOT NULL,
        "responseContent" TEXT NOT NULL,
        "documentUrl" TEXT,
        "answeredAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "answeredBy" TEXT NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FeedbackRating" (
        "id" SERIAL PRIMARY KEY,
        "feedbackId" INTEGER NOT NULL REFERENCES "VoterFeedback"("id") ON DELETE CASCADE,
        "voterPhone" TEXT NOT NULL,
        "voterName" TEXT NOT NULL,
        "rating" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT "FeedbackRating_feedbackId_voterPhone_key" UNIQUE ("feedbackId", "voterPhone")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT,
        "email" TEXT UNIQUE,
        "emailVerified" TIMESTAMP(3),
        "image" TEXT,
        "phone" TEXT,
        "village" TEXT,
        "role" TEXT DEFAULT 'USER' NOT NULL,
        "username" TEXT UNIQUE,
        "passwordHash" TEXT,
        "fullName" TEXT,
        "active" BOOLEAN DEFAULT true NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 2. Kiểm tra nếu bảng VoterFeedback chưa có dữ liệu thì nạp từ feedbacks.json hoặc seed-data
    const countRows: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "VoterFeedback"`);
    const count = Number(countRows[0]?.count || 0);

    if (count === 0) {
      console.log("⚡ CSDL PostgreSQL rỗng, tiến hành nạp tự động dữ liệu ý kiến cử tri...");
      const dataDir = path.join(process.cwd(), "data");
      const jsonFile = path.join(dataDir, "feedbacks.json");
      let itemsToSeed: any[] = [];

      if (fs.existsSync(jsonFile)) {
        try {
          itemsToSeed = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
        } catch (e) {}
      }

      if (!itemsToSeed || itemsToSeed.length === 0) {
        itemsToSeed = initialFeedbacks as any[];
      }

      for (const item of itemsToSeed) {
        try {
          const created = await prisma.voterFeedback.upsert({
            where: { ticketCode: item.ticketCode },
            update: {
              status: item.status || "Đã tiếp nhận",
            },
            create: {
              ticketCode: item.ticketCode,
              voterName: item.voterName || "Cử tri ẩn danh",
              phone: item.phone || null,
              village: item.village || "Thôn 1",
              category: item.category || "Lĩnh vực khác",
              content: item.content || "",
              status: item.status || "Đã tiếp nhận",
              ratingVerySatisfied: item.ratingVerySatisfied || 0,
              ratingSatisfied: item.ratingSatisfied || 0,
              ratingUnsatisfied: item.ratingUnsatisfied || 0,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            },
          });

          // Nếu hồ sơ đã có văn bản trả lời, nạp vào bảng OfficialResponse
          const resp = item.officialResponse || item.response;
          if (resp && resp.responseContent) {
            await prisma.officialResponse.upsert({
              where: { feedbackId: created.id },
              update: {
                answeringOrg: resp.answeringOrg || "UBND xã Ea Súp",
                responseContent: resp.responseContent,
                documentUrl: resp.documentUrl || null,
                answeredBy: resp.answeredBy || "Lãnh đạo UBND xã",
              },
              create: {
                feedbackId: created.id,
                answeringOrg: resp.answeringOrg || "UBND xã Ea Súp",
                responseContent: resp.responseContent,
                documentUrl: resp.documentUrl || null,
                answeredBy: resp.answeredBy || "Lãnh đạo UBND xã",
                answeredAt: resp.answeredAt ? new Date(resp.answeredAt) : new Date(),
              },
            });
          }
        } catch (itemErr) {
          console.warn("Lỗi nạp item:", item.ticketCode, itemErr);
        }
      }
      console.log("✓ Đã nạp thành công dữ liệu cử tri vào PostgreSQL!");
    }

    // 3. Đảm bảo tài khoản admin lehanhkt01 tồn tại trong CSDL
    const adminUser = await prisma.user.findFirst({ where: { username: "lehanhkt01" } });
    if (!adminUser) {
      const passHash = await bcrypt.hash("Hh@$123456", 10);
      await prisma.user.create({
        data: {
          id: "admin_lehanhkt01",
          username: "lehanhkt01",
          passwordHash: passHash,
          fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
          role: "ADMIN",
          active: true,
        },
      });
      console.log("✓ Đã khởi tạo tài khoản quản trị lehanhkt01 trong PostgreSQL!");
    }

    isDbInitialized = true;
    return true;
  } catch (err) {
    console.error("Lỗi khởi tạo cấu trúc CSDL PostgreSQL:", err);
    return false;
  }
}
