"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

/**
 * 消耗型：补充 N 个，更新资产数量，将 action 标为 DONE。
 * 时间型：延期，更新 asset.nextDueAt，将 action 标为 DONE。
 */
export async function completeAction(
	actionId: string,
	restockAmount?: number,
	nextDueAt?: string
): Promise<{ ok: boolean; error?: string }> {
	const auth = await getAuth();
	if (!auth) return { ok: false, error: "未登录" };

	const action = await prisma.action.findFirst({
		where: {
			id: actionId,
			space: { userId: auth.user.id },
			status: "OPEN",
			type: "RESTOCK",
		},
		include: {
			asset: {
				select: {
					id: true,
					kind: true,
					quantity: true,
					reorderPoint: true,
				},
			},
		},
	});
	if (!action || !action.assetId) return { ok: false, error: "行为不存在或无权操作" };

	const asset = action.asset!;

	if (asset.kind === "CONSUMABLE") {
		const amount = restockAmount ?? 0;
		if (typeof amount !== "number" || amount < 0) {
			return { ok: false, error: "请输入有效补充数量" };
		}
		const currentQty = asset.quantity ?? 0;
		const newQty = currentQty + amount;
		const rp = asset.reorderPoint ?? 0;
		await prisma.$transaction([
			prisma.asset.update({
				where: { id: action.assetId },
				data: {
					quantity: newQty,
					state: newQty > rp ? "ACTIVE" : "PENDING",
				},
			}),
			prisma.action.update({
				where: { id: actionId },
				data: { status: "DONE" },
			}),
		]);
	} else if (asset.kind === "TEMPORAL") {
		const dueDate = nextDueAt ? new Date(nextDueAt) : null;
		if (!dueDate || Number.isNaN(dueDate.getTime())) {
			return { ok: false, error: "请选择到期时间" };
		}
		await prisma.$transaction([
			prisma.asset.update({
				where: { id: action.assetId },
				data: { nextDueAt: dueDate },
			}),
			prisma.action.update({
				where: { id: actionId },
				data: { status: "DONE" },
			}),
		]);
	} else {
		await prisma.action.update({
			where: { id: actionId },
			data: { status: "DONE" },
		});
	}

	const locale = await getLocale();
	revalidatePath(`/${locale}/todo`);
	return { ok: true };
}
