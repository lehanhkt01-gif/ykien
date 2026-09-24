import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      village?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    village?: string | null;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    village?: string | null;
    phone?: string | null;
  }
}
