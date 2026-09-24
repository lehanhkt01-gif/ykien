import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

function saveVoterToDisk(user: any) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const usersFile = path.join(dataDir, "users.json");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let list: any[] = [];
    if (fs.existsSync(usersFile)) {
      list = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
    }
    const idx = list.findIndex((u) => u.email === user.email);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user, updatedAt: new Date() };
    } else {
      list.push({ ...user, id: `user_${Date.now()}`, createdAt: new Date() });
    }
    fs.writeFileSync(usersFile, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Lỗi lưu user xuống disk:", e);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // 1. Thử lưu vào CSDL PostgreSQL (nếu database online)
        try {
          if (user.email) {
            await prisma.user.upsert({
              where: { email: user.email },
              create: {
                email: user.email,
                name: user.name || "Cử tri Ea Súp",
                image: user.image || null,
                role: "USER",
              },
              update: {
                name: user.name || undefined,
                image: user.image || undefined,
              },
            });
          }
        } catch (dbErr) {
          // Tự động fallback khi PostgreSQL offline
        }

        // 2. Đồng bộ bền vững vào file JSON
        if (user.email) {
          saveVoterToDisk({
            email: user.email,
            name: user.name || "Cử tri Ea Súp",
            image: user.image || null,
            role: "USER",
          });
        }
      } catch (err) {
        console.error("Lỗi đồng bộ người dùng:", err);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.role = "Cử tri";
        session.user.village = (token.village as string) || null;
        session.user.phone = (token.phone as string) || null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const email = user.email?.toLowerCase() || "";
        const adminEmails = (process.env.ADMIN_EMAILS || "")
          .toLowerCase()
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const cadreEmails = (process.env.CADRE_EMAILS || "")
          .toLowerCase()
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        if (adminEmails.includes(email)) {
          token.role = "ADMIN";
        } else if (cadreEmails.includes(email)) {
          token.role = "CADRE";
        } else {
          token.role = (user as any).role || "USER";
        }
        token.village = (user as any).village || null;
        token.phone = (user as any).phone || null;
      }

      // Hỗ trợ cập nhật thông tin cử tri sau khi lưu Thôn/SĐT
      if (trigger === "update" && session) {
        if (session.village !== undefined) token.village = session.village;
        if (session.phone !== undefined) token.phone = session.phone;
        if (session.name !== undefined) token.name = session.name;
      }

      return token;
    },
  },
  pages: {
    signIn: "/",
  },
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "easup_nextauth_v5_secret_key_2026_super_secure",
});
