import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * 无二进制模式：使用 pg driver adapter，避免部署平台二进制兼容问题。
 * 在开发环境下复用同一 Pool/PrismaClient，避免热重载导致多次实例化。
 */
const globalForPrisma = globalThis as unknown as {
  pool: Pool | undefined;
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Prisma client (engineType=client) requires a driver adapter with a connection string."
    );
  }
  const pool =
    globalForPrisma.pool ?? new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    // 使用 adapter 时不要传 log：内部会注册 JS 回调，adapter 结果路径会做 serde 序列化，无法表示函数，会报 P2010
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
