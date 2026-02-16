"use server";

import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";
import type { SessionPublic } from "@/lib/auth/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 按用户执行：消耗型直接消耗（不产生消耗 Action）+ 仅产生 RESTOCK Action。
 * 规则：
 * 1. 仅当物品处于 ACTIVE 时才产生 Action。
 * 2. 物品不处于 DISCARDED、PAUSED 时正常消耗；消耗时直接更新数量，不创建消耗 Action。
 * 3. 正常读库只产生 RESTOCK Action。
 * 4. 产生完 Action 的物品会进入 PENDING 状态（创建 RESTOCK 后将该资产 state 置为 PENDING）。
 * 5. 产生 Action 时记录 dueAt：消耗型用物品消耗完的时间（lastDoneAt），时间型用到期时间（nextDueAt）。
 * 6. 时间型物品：离到期前一周时产生 RESTOCK Action，dueAt 记录该到期时间。
 */
export async function processConsumablesAndGenerateActionsForUser(
	userId: string
): Promise<void> {
	const now = new Date();
	const nowMs = now.getTime();

	// 1. 直接消耗：CONSUMABLE 且非 DISCARDED、非 PAUSED，按周期扣减数量，不创建任何 Action
	const toConsume = await prisma.asset.findMany({
		where: {
			space: { userId },
			isDeleted: false,
			kind: "CONSUMABLE",
			state: { notIn: ["DISCARDED", "PAUSED"] },
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

	for (const a of toConsume) {
		const intervalDays = a.consumeIntervalDays!;
		const amountPerTime = a.consumeAmountPerTime!;
		const start = (a.lastDoneAt ?? a.createdAt).getTime();
		const elapsedDays = (nowMs - start) / MS_PER_DAY;
		const periods = Math.floor(elapsedDays / intervalDays);
		if (periods < 1) continue;

		const totalConsume = Math.min(periods * amountPerTime, a.quantity ?? 0);
		if (totalConsume <= 0) continue;

		const newQty = Math.max(0, (a.quantity ?? 0) - totalConsume);
		const lastConsumeMs = start + periods * intervalDays * MS_PER_DAY;
		const lastDoneAt = new Date(lastConsumeMs);

		const stateUpdate =
			a.state === "ACTIVE" &&
			a.reorderPoint != null &&
			newQty <= a.reorderPoint
				? { state: "PENDING" as const }
				: {};

		await prisma.asset.update({
			where: { id: a.id },
			data: {
				quantity: newQty,
				lastDoneAt,
				...stateUpdate,
			},
		});
	}

	// 2. 仅产生 RESTOCK Action：CONSUMABLE 且 state === ACTIVE 且 quantity <= reorderPoint，且该资产尚无 OPEN 的 RESTOCK
	const needRestock = await prisma.asset.findMany({
		where: {
			space: { userId },
			isDeleted: false,
			kind: "CONSUMABLE",
			state: "ACTIVE",
			quantity: { not: null },
			reorderPoint: { not: null },
		},
		select: {
			id: true,
			spaceId: true,
			quantity: true,
			reorderPoint: true,
			lastDoneAt: true,
		},
	});

	const existingOpenRestockAssetIds = new Set(
		(
			await prisma.action.findMany({
				where: {
					assetId: { in: needRestock.map((r) => r.id) },
					type: "RESTOCK",
					status: "OPEN",
				},
				select: { assetId: true },
			})
		)
			.map((a) => a.assetId)
			.filter((id): id is string => id != null)
	);

	for (const r of needRestock) {
		const q = r.quantity!;
		const rp = r.reorderPoint!;
		if (q > rp) continue;
		if (existingOpenRestockAssetIds.has(r.id)) continue;

		// 消耗型：dueAt 记录物品消耗完的时间（lastDoneAt），无则用当前时间
		const restockDueAt = r.lastDoneAt ?? now;
		// 产生 RESTOCK 后将该物品置为 PENDING，避免重复产生 Action
		await prisma.$transaction(async (tx) => {
			await tx.action.create({
				data: {
					spaceId: r.spaceId,
					assetId: r.id,
					type: "RESTOCK",
					status: "OPEN",
					dueAt: restockDueAt,
				},
			});
			await tx.asset.update({
				where: { id: r.id },
				data: { state: "PENDING" },
			});
		});
		existingOpenRestockAssetIds.add(r.id);
	}

	// 3. 时间型：离到期前一周时产生 RESTOCK Action，dueAt = 到期时间（nextDueAt）
	const oneWeekFromNow = new Date(nowMs + 7 * MS_PER_DAY);
	const needTemporalAction = await prisma.asset.findMany({
		where: {
			space: { userId },
			isDeleted: false,
			kind: "TEMPORAL",
			state: "ACTIVE",
			nextDueAt: { not: null, lte: oneWeekFromNow },
		},
		select: {
			id: true,
			spaceId: true,
			nextDueAt: true,
		},
	});

	const existingOpenTemporalAssetIds = new Set(
		(
			await prisma.action.findMany({
				where: {
					assetId: { in: needTemporalAction.map((t) => t.id) },
					type: "RESTOCK",
					status: "OPEN",
				},
				select: { assetId: true },
			})
		)
			.map((a) => a.assetId)
			.filter((id): id is string => id != null)
	);

	for (const t of needTemporalAction) {
		if (!t.nextDueAt) continue;
		if (existingOpenTemporalAssetIds.has(t.id)) continue;

		await prisma.$transaction(async (tx) => {
			await tx.action.create({
				data: {
					spaceId: t.spaceId,
					assetId: t.id,
					type: "RESTOCK",
					status: "OPEN",
					dueAt: t.nextDueAt!,
				},
			});
			await tx.asset.update({
				where: { id: t.id },
				data: { state: "PENDING" },
			});
		});
		existingOpenTemporalAssetIds.add(t.id);
	}
}

export async function processConsumablesAndGenerateActions(
	auth?: SessionPublic | null
): Promise<void> {
	const currentAuth = auth ?? (await getAuth());
	if (!currentAuth) return;
	await processConsumablesAndGenerateActionsForUser(currentAuth.user.id);
}
