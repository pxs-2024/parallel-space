import { PrismaClient } from "@/generated/prisma/client";

/**
 * 在开发环境下避免 Next.js 热重载导致
 * PrismaClient 被多次实例化
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
