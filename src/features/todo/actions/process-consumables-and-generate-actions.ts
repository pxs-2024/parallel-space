"use server";

import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";
import type { SessionPublic } from "@/lib/auth/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 按用户执行：消耗型资产 AUTO_CONSUME + RESTOCK/REMIND 生成。
 * 供 cron API 遍历所有用户调用，或单用户入口复用。
 */
export async function processConsumablesAndGenerateActionsForUser(
  userId: string
): Promise<void> {
  const consumables = await prisma.asset.findMany({
    where: {
      space: { userId },
      isDeleted: false,
      kind: "CONSUMABLE",
      consumeIntervalDays: { not: null },
      consumeAmountPerTime: { not: null },
    },
    select: {
      id: true,
      spaceId: true,
      quantity: true,
      state: true,
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
    const lastConsumeMs = start + periods * intervalDays * MS_PER_DAY;
    const lastDoneAt = new Date(lastConsumeMs);

    const stateUpdates: { state?: (typeof a)["state"] } = {};
    if (newQty === 0 && a.state !== "PENDING_DISCARD") {
      stateUpdates.state = "PENDING_DISCARD";
    } else if (
      a.reorderPoint != null &&
      newQty <= a.reorderPoint &&
      a.state !== "PENDING_DISCARD"
    ) {
      stateUpdates.state = "PENDING_RESTOCK";
    }

    await prisma.$transaction(async (tx) => {
      await tx.action.create({
        data: {
          spaceId: a.spaceId,
          assetId: a.id,
          type: "AUTO_CONSUME",
          status: "DONE",
        },
      });

      const updateData: Parameters<typeof tx.asset.update>[0]["data"] = {
        quantity: newQty,
        lastDoneAt,
        ...stateUpdates,
      };

      if (newQty === 0 && a.state !== "PENDING_DISCARD") {
        const discardAction = await tx.action.create({
          data: {
            spaceId: a.spaceId,
            assetId: a.id,
            type: "DISCARD",
            status: "OPEN",
          },
        });
        (updateData as { openPromptActionId: string }).openPromptActionId =
          discardAction.id;
      }

      await tx.asset.update({
        where: { id: a.id },
        data: updateData,
      });
    });
  }

  const soon = new Date(now.getTime() + 7 * MS_PER_DAY);

  const needRestock = await prisma.asset.findMany({
    where: {
      space: { userId },
      isDeleted: false,
      kind: "CONSUMABLE",
      quantity: { not: null },
      reorderPoint: { not: null },
      openPromptActionId: null,
      OR: [
        { snoozeUntil: null },
        { snoozeUntil: { lte: now } },
      ],
    },
    select: {
      id: true,
      spaceId: true,
      name: true,
      quantity: true,
      unit: true,
      reorderPoint: true,
    },
  });

  for (const r of needRestock) {
    const q = r.quantity!;
    const rp = r.reorderPoint!;
    if (q > rp) continue;
    const action = await prisma.action.create({
      data: {
        spaceId: r.spaceId,
        assetId: r.id,
        type: "RESTOCK",
        status: "OPEN",
      },
    });
    await prisma.asset.update({
      where: { id: r.id },
      data: {
        openPromptActionId: action.id,
        state: "PENDING_RESTOCK",
      },
    });
  }

  const temporals = await prisma.asset.findMany({
    where: {
      space: { userId },
      isDeleted: false,
      kind: "TEMPORAL",
      nextDueAt: { not: null, lte: soon },
      openPromptActionId: null,
      OR: [
        { snoozeUntil: null },
        { snoozeUntil: { lte: now } },
      ],
    },
    select: { id: true, spaceId: true, nextDueAt: true },
  });
  for (const t of temporals) {
    const action = await prisma.action.create({
      data: {
        spaceId: t.spaceId,
        assetId: t.id,
        type: "REMIND",
        status: "OPEN",
        dueAt: t.nextDueAt!,
      },
    });
    await prisma.asset.update({
      where: { id: t.id },
      data: { openPromptActionId: action.id },
    });
  }

  const virtuals = await prisma.asset.findMany({
    where: {
      space: { userId },
      isDeleted: false,
      kind: "VIRTUAL",
      expiresAt: { not: null, lte: soon },
      openPromptActionId: null,
      OR: [
        { snoozeUntil: null },
        { snoozeUntil: { lte: now } },
      ],
    },
    select: { id: true, spaceId: true, expiresAt: true },
  });
  for (const v of virtuals) {
    const action = await prisma.action.create({
      data: {
        spaceId: v.spaceId,
        assetId: v.id,
        type: "REMIND",
        status: "OPEN",
        dueAt: v.expiresAt!,
      },
    });
    await prisma.asset.update({
      where: { id: v.id },
      data: { openPromptActionId: action.id },
    });
  }
}

export async function processConsumablesAndGenerateActions(
  auth?: SessionPublic | null
): Promise<void> {
  const currentAuth = auth ?? (await getAuth());
  if (!currentAuth) return;
  await processConsumablesAndGenerateActionsForUser(currentAuth.user.id);
}
