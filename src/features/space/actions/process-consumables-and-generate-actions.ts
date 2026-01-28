"use server";

import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 进入系统时调用：遍历当前用户所有消耗型资产，按消耗规则执行 AUTO_CONSUME，
 * 再根据更新后状态生成需用户确认的 RESTOCK/REMIND。
 */
export async function processConsumablesAndGenerateActions(): Promise<void> {
  const auth = await getAuth();
  if (!auth) return;

  const consumables = await prisma.asset.findMany({
    where: {
      space: { userId: auth.user.id },
      isDeleted: false,
      kind: "CONSUMABLE",
      consumeIntervalDays: { not: null },
      consumeAmountPerTime: { not: null },
    },
    select: {
      id: true,
      spaceId: true,
      quantity: true,
      lastDoneAt: true,
      createdAt: true,
      consumeIntervalDays: true,
      consumeAmountPerTime: true,
      reorderPoint: true,
    },
  });

  const now = new Date();
  const nowMs = now.getTime();

  for (const a of consumables) {
    const intervalDays = a.consumeIntervalDays!;
    const amountPerTime = a.consumeAmountPerTime!;
    const start = (a.lastDoneAt ?? a.createdAt).getTime();
    const elapsedDays = (nowMs - start) / MS_PER_DAY;
    const periods = Math.floor(elapsedDays / intervalDays);
    if (periods < 1) continue;

    const totalConsume = Math.min(
      periods * amountPerTime,
      a.quantity ?? 0
    );
    if (totalConsume <= 0) continue;

    const newQty = Math.max(0, (a.quantity ?? 0) - totalConsume);

    await prisma.$transaction([
      prisma.asset.update({
        where: { id: a.id },
        data: { quantity: newQty, lastDoneAt: now },
      }),
      prisma.action.create({
        data: {
          spaceId: a.spaceId,
          assetId: a.id,
          type: "AUTO_CONSUME",
          status: "DONE",
          requestedAmount: totalConsume,
          appliedAmount: totalConsume,
        },
      }),
    ]);
  }

  // 生成需用户确认的 RESTOCK / REMIND（排除已被 snooze 的）
  const snoozed = await prisma.action.findMany({
    where: {
      space: { userId: auth.user.id },
      status: "SKIPPED",
      snoozeUntil: { gt: now },
    },
    select: { assetId: true, type: true },
  });
  const snoozedSet = new Set(
    snoozed.filter((x) => x.assetId).map((x) => `${x.assetId!}:${x.type}`)
  );

  const openKeys = await prisma.action.findMany({
    where: {
      space: { userId: auth.user.id },
      status: "OPEN",
      assetId: { not: null },
    },
    select: { assetId: true, type: true },
  });
  const openSet = new Set(
    openKeys.filter((x) => x.assetId).map((x) => `${x.assetId!}:${x.type}`)
  );

  const soon = new Date(now.getTime() + 7 * MS_PER_DAY);

  // RESTOCK: 消耗型且数量 <= 补货点
  const needRestock = await prisma.asset.findMany({
    where: {
      space: { userId: auth.user.id },
      isDeleted: false,
      kind: "CONSUMABLE",
      quantity: { not: null },
      reorderPoint: { not: null },
    },
    select: { id: true, spaceId: true, name: true, quantity: true, unit: true, reorderPoint: true },
  });

  for (const r of needRestock) {
    const q = r.quantity!;
    const rp = r.reorderPoint!;
    if (q > rp) continue;
    const key = `${r.id}:RESTOCK`;
    if (openSet.has(key) || snoozedSet.has(key)) continue;
    await prisma.action.create({
      data: {
        spaceId: r.spaceId,
        assetId: r.id,
        type: "RESTOCK",
        status: "OPEN",
      },
    });
    openSet.add(key);
  }

  // REMIND: 时间型/虚拟型到期或即将到期
  const temporals = await prisma.asset.findMany({
    where: {
      space: { userId: auth.user.id },
      isDeleted: false,
      kind: "TEMPORAL",
      nextDueAt: { not: null, lte: soon },
    },
    select: { id: true, spaceId: true, nextDueAt: true },
  });
  for (const t of temporals) {
    const key = `${t.id}:REMIND`;
    if (openSet.has(key) || snoozedSet.has(key)) continue;
    await prisma.action.create({
      data: {
        spaceId: t.spaceId,
        assetId: t.id,
        type: "REMIND",
        status: "OPEN",
        dueAt: t.nextDueAt!,
      },
    });
    openSet.add(key);
  }

  const virtuals = await prisma.asset.findMany({
    where: {
      space: { userId: auth.user.id },
      isDeleted: false,
      kind: "VIRTUAL",
      expiresAt: { not: null, lte: soon },
    },
    select: { id: true, spaceId: true, expiresAt: true },
  });
  for (const v of virtuals) {
    const key = `${v.id}:REMIND`;
    if (openSet.has(key) || snoozedSet.has(key)) continue;
    await prisma.action.create({
      data: {
        spaceId: v.spaceId,
        assetId: v.id,
        type: "REMIND",
        status: "OPEN",
        dueAt: v.expiresAt!,
      },
    });
    openSet.add(key);
  }
}
