import "dotenv/config";

import { hash } from "@node-rs/argon2";
import {
	Prisma,
	PrismaClient,
	AssetKind,
	AssetState,
	ActionType,
	ActionStatus,
} from "@/generated/prisma/client";

const prisma = new PrismaClient();

const users = [
	{ username: "admin", email: "2829791064@qq.com" },
	{ username: "user", email: "hello@vdigital.design" },
];

const spaces = [
	{ name: "空间1", description: "空间1描述" },
	{ name: "书房", description: "书房物品" },
	{ name: "厨房", description: "厨房耗材与食材" },
	{ name: "办公室", description: "办公用品与设备" },
	{ name: "浴室", description: "洗护与日耗" },
	{ name: "药箱", description: "药品与保健品" },
	{ name: "车库", description: "工具与耗材" },
];

// 资产模板：按 kind 区分，便于为不同 space 生成
const assetTemplates = {
	[AssetKind.STATIC]: [
		{ name: "书", description: "书房书籍", x: 0, y: 0 },
		{ name: "显示器", description: "办公显示器", x: 100, y: 200 },
		{ name: "工具箱", description: "常用工具", x: 50, y: 50 },
	],
	[AssetKind.CONSUMABLE]: [
		{
			name: "笔记本",
			description: "消耗型",
			quantity: 2,
			unit: "本",
			reorderPoint: 5,
			x: 100,
			y: 100,
		},
		{
			name: "笔",
			description: "签字笔",
			quantity: 3,
			unit: "支",
			reorderPoint: 5,
			consumeIntervalDays: 30,
			consumeAmountPerTime: 1,
			x: 150,
			y: 150,
		},
		{
			name: "抽纸",
			description: "盒装抽纸",
			quantity: 1,
			unit: "盒",
			reorderPoint: 2,
			x: 200,
			y: 100,
		},
		{
			name: "洗洁精",
			description: "厨房用",
			quantity: 0,
			unit: "瓶",
			reorderPoint: 1,
			state: AssetState.PENDING_RESTOCK,
			x: 80,
			y: 80,
		},
		{
			name: "垃圾袋",
			description: "大号",
			quantity: 4,
			unit: "卷",
			reorderPoint: 2,
			x: 120,
			y: 120,
		},
		{
			name: "咖啡豆",
			description: "办公室咖啡",
			quantity: 1,
			unit: "袋",
			reorderPoint: 1,
			state: AssetState.PENDING_RESTOCK,
			x: 180,
			y: 90,
		},
		{
			name: "洗发水",
			description: "洗护",
			quantity: 0,
			unit: "瓶",
			reorderPoint: 1,
			state: AssetState.PENDING_RESTOCK,
			x: 60,
			y: 60,
		},
		{
			name: "创可贴",
			description: "药箱常备",
			quantity: 2,
			unit: "盒",
			reorderPoint: 1,
			x: 100,
			y: 100,
		},
		{
			name: "机油",
			description: "车库保养",
			quantity: 0,
			unit: "瓶",
			reorderPoint: 1,
			state: AssetState.PENDING_RESTOCK,
			x: 200,
			y: 200,
		},
	],
	[AssetKind.TEMPORAL]: [
		{
			name: "滤芯",
			description: "净水器滤芯",
			lastDoneAt: null,
			nextDueAt: null,
			x: 90,
			y: 90,
		},
		{
			name: "空调清洗",
			description: "年度清洗",
			lastDoneAt: null,
			nextDueAt: null,
			x: 70,
			y: 70,
		},
	],
	[AssetKind.VIRTUAL]: [
		{
			name: "会员订阅",
			description: "年度会员",
			refUrl: "https://example.com",
			expiresAt: null,
		},
		{
			name: "域名",
			description: "网站域名",
			refUrl: "https://example.com",
			expiresAt: null,
		},
	],
};

const seed = async () => {
	const t0 = performance.now();
	console.log("DB Seed: Started ...");
	await prisma.action.deleteMany();
	await prisma.asset.deleteMany();
	await prisma.space.deleteMany();
	await prisma.session.deleteMany();
	await prisma.user.deleteMany();

	const passwordHash = await hash("pxs666");
	const createdUsers = await prisma.user.createManyAndReturn({
		data: users.map((u) => ({ ...u, passwordHash })),
	});
	const admin = createdUsers[0];
	const secondUser = createdUsers[1];

	const createdSpaces = await prisma.space.createManyAndReturn({
		data: spaces.map((s) => ({ ...s, userId: admin.id })),
	});

	const baseTime = new Date();
	const oneDay = 24 * 60 * 60 * 1000;
	const soon = (d: number) => new Date(baseTime.getTime() + d * oneDay);
	const past = (d: number) => new Date(baseTime.getTime() - d * oneDay);

	// 为每个空间创建资产
	let assetIndex = 0;

	for (let sIdx = 0; sIdx < createdSpaces.length; sIdx++) {
		const space = createdSpaces[sIdx];
		const spaceName = spaces[sIdx].name;

		// 每个空间：2 个 STATIC，若干 CONSUMABLE，部分 TEMPORAL/VIRTUAL
		const toCreate: Prisma.AssetCreateManyInput[] = [];

		// STATIC
		for (let i = 0; i < 2; i++) {
			const t = assetTemplates[AssetKind.STATIC][i % assetTemplates[AssetKind.STATIC].length];
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}${sIdx > 1 ? `-${spaceName}` : ""}`,
				description: t.description,
				kind: AssetKind.STATIC,
				state: AssetState.ACTIVE,
				isDeleted: false,
				x: (t as { x?: number }).x ?? 0,
				y: (t as { y?: number }).y ?? 0,
			});
		}

		// CONSUMABLE：每空间 3～4 个
		const cons = assetTemplates[AssetKind.CONSUMABLE];
		for (let i = 0; i < 4; i++) {
			const t = cons[(assetIndex + i) % cons.length];
			const state = (t as { state?: AssetState }).state ?? AssetState.ACTIVE;
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}${sIdx > 0 ? `-${spaceName}` : ""}`,
				description: t.description,
				kind: AssetKind.CONSUMABLE,
				state,
				isDeleted: false,
				quantity: t.quantity,
				unit: t.unit,
				reorderPoint: t.reorderPoint,
				consumeIntervalDays: t.consumeIntervalDays ?? null,
				consumeAmountPerTime: t.consumeAmountPerTime ?? null,
				x: (t as { x?: number }).x ?? 0,
				y: (t as { y?: number }).y ?? 0,
			});
		}
		assetIndex += 4;

		// TEMPORAL：部分空间各 1 个，带 nextDueAt 便于决策建议
		if (sIdx < 4) {
			const t = assetTemplates[AssetKind.TEMPORAL][sIdx % assetTemplates[AssetKind.TEMPORAL].length];
			const nextDue = sIdx % 2 === 0 ? past(2) : soon(5); // 已过期或即将到期
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}-${spaceName}`,
				description: t.description,
				kind: AssetKind.TEMPORAL,
				state: AssetState.ACTIVE,
				isDeleted: false,
				lastDoneAt: t.lastDoneAt ?? past(100),
				nextDueAt: nextDue,
				x: (t as { x?: number }).x ?? 0,
				y: (t as { y?: number }).y ?? 0,
			});
		}

		// VIRTUAL：前 3 个空间各 1 个
		if (sIdx < 3) {
			const t = assetTemplates[AssetKind.VIRTUAL][sIdx % assetTemplates[AssetKind.VIRTUAL].length];
			const exp = sIdx === 0 ? past(1) : soon(30);
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}-${spaceName}`,
				description: t.description,
				kind: AssetKind.VIRTUAL,
				state: AssetState.ACTIVE,
				isDeleted: false,
				refUrl: t.refUrl,
				expiresAt: exp,
			});
		}

		await prisma.asset.createMany({ data: toCreate });
	}

	// 查询所有资产，用于创建 action
	const assetsBySpace = await prisma.asset.findMany({
		where: { isDeleted: false },
		select: { id: true, spaceId: true, name: true, kind: true, state: true, quantity: true, reorderPoint: true, nextDueAt: true, expiresAt: true },
	});

	const actionRows: {
		spaceId: string;
		assetId: string | null;
		type: ActionType;
		status: ActionStatus;
		dueAt: Date | null;
		createdAt: Date;
	}[] = [];

	// 为每个空间生成历史 action（DONE/SKIPPED/DISCARDED）和部分 OPEN（决策面板用）
	for (const space of createdSpaces) {
		const spaceAssets = assetsBySpace.filter((a) => a.spaceId === space.id);
		const consumables = spaceAssets.filter((a) => a.kind === AssetKind.CONSUMABLE);
		const temporals = spaceAssets.filter((a) => a.kind === AssetKind.TEMPORAL);
		const virtuals = spaceAssets.filter((a) => a.kind === AssetKind.VIRTUAL);

		// 历史：AUTO_CONSUME / RESTOCK / REMIND 若干
		for (let i = 0; i < Math.min(3, consumables.length); i++) {
			const a = consumables[i];
			actionRows.push({
				spaceId: space.id,
				assetId: a.id,
				type: ActionType.AUTO_CONSUME,
				status: ActionStatus.DONE,
				dueAt: null,
				createdAt: past(7 + i),
			});
		}
		for (let i = 0; i < Math.min(2, consumables.length); i++) {
			const a = consumables[i];
			actionRows.push({
				spaceId: space.id,
				assetId: a.id,
				type: ActionType.RESTOCK,
				status: ActionStatus.DONE,
				dueAt: null,
				createdAt: past(5 + i),
			});
		}
		for (let i = 0; i < Math.min(2, temporals.length); i++) {
			const a = temporals[i];
			actionRows.push({
				spaceId: space.id,
				assetId: a.id,
				type: ActionType.REMIND,
				status: i === 0 ? ActionStatus.DONE : ActionStatus.SKIPPED,
				dueAt: a.nextDueAt,
				createdAt: past(3 + i),
			});
		}
		for (const a of virtuals) {
			actionRows.push({
				spaceId: space.id,
				assetId: a.id,
				type: ActionType.REMIND,
				status: ActionStatus.DONE,
				dueAt: a.expiresAt,
				createdAt: past(2),
			});
		}

		// OPEN 行为：决策面板展示 — 每空间 0～2 个 RESTOCK/REMIND/DISCARD
		const pendingRestock = consumables.filter((a) => a.state === AssetState.PENDING_RESTOCK || (a.quantity != null && a.reorderPoint != null && a.quantity <= a.reorderPoint));
		const pendingRemind = temporals.filter((a) => a.nextDueAt && a.nextDueAt <= soon(7));
		const pendingDiscard = consumables.filter((a) => a.quantity === 0);

		for (let i = 0; i < Math.min(2, pendingRestock.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: pendingRestock[i].id,
				type: ActionType.RESTOCK,
				status: ActionStatus.OPEN,
				dueAt: null,
				createdAt: baseTime,
			});
		}
		for (let i = 0; i < Math.min(1, pendingRemind.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: pendingRemind[i].id,
				type: ActionType.REMIND,
				status: ActionStatus.OPEN,
				dueAt: pendingRemind[i].nextDueAt ?? null,
				createdAt: baseTime,
			});
		}
		for (let i = 0; i < Math.min(1, pendingDiscard.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: pendingDiscard[i].id,
				type: ActionType.DISCARD,
				status: ActionStatus.OPEN,
				dueAt: null,
				createdAt: baseTime,
			});
		}
	}

	// 再补几条 OPEN，确保决策页有内容（若前面不足）
	const anyConsumable = assetsBySpace.find((a) => a.kind === AssetKind.CONSUMABLE && a.spaceId === createdSpaces[0].id);
	const anyTemporal = assetsBySpace.find((a) => a.kind === AssetKind.TEMPORAL && a.nextDueAt);
	if (anyConsumable && actionRows.filter((r) => r.status === ActionStatus.OPEN && r.type === ActionType.RESTOCK).length < 3) {
		actionRows.push({
			spaceId: createdSpaces[0].id,
			assetId: anyConsumable.id,
			type: ActionType.RESTOCK,
			status: ActionStatus.OPEN,
			dueAt: null,
			createdAt: baseTime,
		});
	}
	if (anyTemporal && actionRows.filter((r) => r.status === ActionStatus.OPEN && r.type === ActionType.REMIND).length < 2) {
		actionRows.push({
			spaceId: anyTemporal.spaceId,
			assetId: anyTemporal.id,
			type: ActionType.REMIND,
			status: ActionStatus.OPEN,
			dueAt: anyTemporal.nextDueAt,
			createdAt: baseTime,
		});
	}

	await prisma.action.createMany({
		data: actionRows.map((a) => ({
			spaceId: a.spaceId,
			assetId: a.assetId,
			type: a.type,
			status: a.status,
			dueAt: a.dueAt,
			createdAt: a.createdAt,
			updatedAt: a.createdAt,
		})),
	});

	const t1 = performance.now();
	console.log(`DB Seed: Finished (${(t1 - t0).toFixed(0)}ms)`);
	console.log(`  Users: ${createdUsers.length}, Spaces: ${createdSpaces.length}, Assets: ${assetsBySpace.length}, Actions: ${actionRows.length}`);
};

seed();
