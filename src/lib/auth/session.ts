"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { SessionPublic } from "./types";
import { generateSecureRandomString, hashSecret, constantTimeEqual } from "./utils";

/**
 * 创建 session，并返回要下发给客户端的 token
 */
export async function createSession(userId: string): Promise<SessionPublic & { token: string }> {
  const now = new Date();
  const id = generateSecureRandomString();
  const secret = generateSecureRandomString();
  const secretHash = await hashSecret(secret); // Uint8Array

  const token = `${id}.${secret}`;

  // 创建一个新的 Uint8Array 以确保类型兼容性（从 ArrayBufferLike 转换为 ArrayBuffer）
  // 通过复制数据创建新的 ArrayBuffer
  // todo
  const secretHashBuffer = new Uint8Array(secretHash.length);
  secretHashBuffer.set(secretHash);

  const row = await prisma.session.create({
    data: {
      id,
      userId,
      secretHash: secretHashBuffer,
      createdAt: now,
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  return { id, userId, createdAt: now, token, user: row.user };
}

/**
 * 验证 token，返回 session（有效）或 null（无效/过期）
 */
export async function validateSessionToken(token: string): Promise<SessionPublic | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const sessionId = parts[0];
  const sessionSecret = parts[1];

  const row = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      secretHash: true,
      createdAt: true,
      user: { select: { id: true, username: true, email: true } },
    },
  });
  if (!row) return null;

  const tokenSecretHash = await hashSecret(sessionSecret);

  // ✅ 兼容 Buffer / Uint8Array
  const dbSecretHash =
    row.secretHash instanceof Uint8Array ? row.secretHash : new Uint8Array(row.secretHash);

  if (!constantTimeEqual(tokenSecretHash, dbSecretHash)) return null;

  return { id: row.id, userId: row.userId, createdAt: row.createdAt, user: row.user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
