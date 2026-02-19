"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";
import { AssetKind } from "@/generated/prisma/client";

/**
 * 新增物品类待办：选择空间后在该空间创建物品（放在最前），并将 action 标为 DONE。
 */
export async function completeNewAssetAction(
	actionId: string,
	spaceId: string
): Promise<{ ok: boolean; error?: string }> {
	const auth = await getAuth();
	if (!auth) return { ok: false, error: "未登录" };

	const action = await prisma.action.findFirst({
		where: {
			id: actionId,
			space: { userId: auth.user.id },
			status: "OPEN",
			type: "NEW_ASSET",
		},
	});
	if (!action) return { ok: false, error: "待办不存在或已处理" };

	const space = await prisma.space.findFirst({
		where: { id: spaceId, userId: auth.user.id },
	});
	if (!space) return { ok: false, error: "空间不存在或无权操作" };

	const payload = (action.payload as { name?: string; unit?: string | null; needQty?: number } | null) ?? {};
	const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 191) : "未命名";
	const needQty = typeof payload.needQty === "number" && payload.needQty >= 0 ? payload.needQty : 0;
	const unit = typeof payload.unit === "string" ? payload.unit.trim().slice(0, 50) || null : null;

	await prisma.$transaction([
		prisma.asset.create({
			data: {
				spaceId,
				name,
				kind: AssetKind.STATIC,
				quantity: 0,
				unit,
				reorderPoint: needQty > 0 ? needQty : 1,
			},
		}),
		prisma.action.update({
			where: { id: actionId },
			data: { status: "DONE" },
		}),
	]);

	const locale = await getLocale();
	revalidatePath(`/${locale}/todo`);
	revalidatePath(`/${locale}/spaces`);
	return { ok: true };
}

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
