"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

export type SnoozeChoice = "ignore_day" | "ignore_week" | "ignore_month";

const SNOOZE_DAYS: Record<SnoozeChoice, number> = {
  ignore_day: 1,
  ignore_week: 7,
  ignore_month: 30,
};

/** 用户选择“忽略”：将 action 标记为 SKIPPED 并设置 snoozeUntil */
export async function snoozeAction(
  actionId: string,
  choice: SnoozeChoice
): Promise<{ ok: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const action = await prisma.action.findFirst({
    where: {
      id: actionId,
      space: { userId: auth.user.id },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND"] },
    },
  });
  if (!action) return { ok: false, error: "行为不存在或无权操作" };

  const days = SNOOZE_DAYS[choice];
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);

  await prisma.action.update({
    where: { id: actionId },
    data: { status: "SKIPPED", snoozeUntil },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/decisions`);

  return { ok: true };
}

/** 用户选择“补充”：RESTOCK 需传入补充数量并更新资产，REMIND 仅标记 DONE */
export async function completeAction(
  actionId: string,
  restockAmount?: number
): Promise<{ ok: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const action = await prisma.action.findFirst({
    where: {
      id: actionId,
      space: { userId: auth.user.id },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND"] },
    },
    include: { asset: { select: { id: true, quantity: true } } },
  });
  if (!action) return { ok: false, error: "行为不存在或无权操作" };

  if (action.type === "RESTOCK" && action.assetId) {
    const amount = restockAmount ?? 0;
    if (typeof amount !== "number" || amount < 0) {
      return { ok: false, error: "请输入有效补充数量" };
    }
    const currentQty = action.asset?.quantity ?? 0;
    await prisma.$transaction([
      prisma.asset.update({
        where: { id: action.assetId },
        data: { quantity: currentQty + amount },
      }),
      prisma.action.update({
        where: { id: actionId },
        data: { status: "DONE", appliedAmount: amount },
      }),
    ]);
  } else {
    await prisma.action.update({
      where: { id: actionId },
      data: { status: "DONE" },
    });
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/decisions`);

  return { ok: true };
}
