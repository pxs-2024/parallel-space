import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import {
	Prisma,
	PrismaClient,
	AssetKind,
	AssetState,
	ActionType,
	ActionStatus,
} from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** 布局：最大卡片 160，间距 24，每行 6 个；物品尺寸有大小区分 */
const CARD_MAX = 160;
const GAP = 24;
const STEP_X = CARD_MAX + GAP;
const STEP_Y = CARD_MAX + GAP;
const COLS = 6;

/** 多种尺寸，避免全部一样大（宽、高可不同） */
const SIZE_OPTIONS = [100, 120, 140, 160];

function layoutAt(index: number): { x: number; y: number } {
	return {
		x: (index % COLS) * STEP_X,
		y: Math.floor(index / COLS) * STEP_Y,
	};
}

/** 按索引取不同宽高，保证有大小差异 */
function sizeAt(index: number): { width: number; height: number } {
	const w = SIZE_OPTIONS[index % SIZE_OPTIONS.length];
	const h = SIZE_OPTIONS[(index + Math.floor(index / 4)) % SIZE_OPTIONS.length];
	return { width: w, height: h };
}

const users = [
	{ username: "admin", email: "2829791064@qq.com" },
	{ username: "user", email: "hello@vdigital.design" },
];

const spaces = [
	{ name: "空间1", description: "默认测试空间" },
	{ name: "书房", description: "书房书籍与文具" },
	{ name: "厨房", description: "厨房耗材与食材" },
	{ name: "办公室", description: "办公用品与设备" },
	{ name: "浴室", description: "洗护与日耗" },
	{ name: "药箱", description: "药品与保健品" },
	{ name: "车库", description: "工具与耗材" },
	{ name: "客厅", description: "客厅收纳与消耗品" },
	{ name: "卧室", description: "卧室用品与收纳" },
	{ name: "阳台", description: "绿植与杂物" },
	{ name: "儿童房", description: "儿童用品与玩具" },
	{ name: "储物间", description: "囤货与换季" },
	{ name: "健身房", description: "运动装备与补给" },
	{ name: "宠物角", description: "宠物粮与用品" },
	{ name: "玄关", description: "鞋帽与出门用品" },
	{ name: "影音室", description: "设备与线材" },
];

// 静态物品模板（无 x/y，由布局函数分配）
const staticTemplates = [
	{ name: "书", description: "书房书籍" },
	{ name: "显示器", description: "办公显示器" },
	{ name: "工具箱", description: "常用工具" },
	{ name: "书架", description: "置物架" },
	{ name: "台灯", description: "阅读灯" },
	{ name: "键盘", description: "机械键盘" },
	{ name: "椅子", description: "办公椅" },
	{ name: "收纳盒", description: "桌面收纳" },
];

// 消耗型模板（含 quantity/unit/reorderPoint 等，部分带 state: PENDING_RESTOCK）
const consumableTemplates = [
	{ name: "笔记本", description: "消耗型", quantity: 2, unit: "本", reorderPoint: 5 },
	{ name: "笔", description: "签字笔", quantity: 3, unit: "支", reorderPoint: 5, consumeIntervalDays: 30, consumeAmountPerTime: 1 },
	{ name: "抽纸", description: "盒装抽纸", quantity: 1, unit: "盒", reorderPoint: 2 },
	{ name: "洗洁精", description: "厨房用", quantity: 0, unit: "瓶", reorderPoint: 1, state: AssetState.PENDING_RESTOCK },
	{ name: "垃圾袋", description: "大号", quantity: 4, unit: "卷", reorderPoint: 2 },
	{ name: "咖啡豆", description: "办公室咖啡", quantity: 1, unit: "袋", reorderPoint: 1, state: AssetState.PENDING_RESTOCK },
	{ name: "洗发水", description: "洗护", quantity: 0, unit: "瓶", reorderPoint: 1, state: AssetState.PENDING_RESTOCK },
	{ name: "创可贴", description: "药箱常备", quantity: 2, unit: "盒", reorderPoint: 1 },
	{ name: "机油", description: "车库保养", quantity: 0, unit: "瓶", reorderPoint: 1, state: AssetState.PENDING_RESTOCK },
	{ name: "酱油", description: "厨房调味", quantity: 1, unit: "瓶", reorderPoint: 1 },
	{ name: "牙膏", description: "浴室日耗", quantity: 0, unit: "支", reorderPoint: 1, state: AssetState.PENDING_RESTOCK },
	{ name: "便利贴", description: "办公用品", quantity: 3, unit: "本", reorderPoint: 2 },
	{ name: "电池", description: "5号电池", quantity: 0, unit: "节", reorderPoint: 4, state: AssetState.PENDING_RESTOCK },
	{ name: "湿巾", description: "婴儿湿巾", quantity: 2, unit: "包", reorderPoint: 1 },
	{ name: "茶叶", description: "绿茶", quantity: 1, unit: "罐", reorderPoint: 1 },
	{ name: "消毒液", description: "药箱常备", quantity: 0, unit: "瓶", reorderPoint: 1, state: AssetState.PENDING_RESTOCK },
	{ name: "胶带", description: "透明胶带", quantity: 2, unit: "卷", reorderPoint: 1 },
	{ name: "洗衣液", description: "浴室洗护", quantity: 1, unit: "瓶", reorderPoint: 1 },
];

// 时间型模板
const temporalTemplates = [
	{ name: "滤芯", description: "净水器滤芯" },
	{ name: "空调清洗", description: "年度清洗" },
	{ name: "换季收纳", description: "换季整理" },
	{ name: "车辆保养", description: "机油机滤" },
	{ name: "体检", description: "年度体检" },
	{ name: "保险续费", description: "车险/家险" },
];

// 虚拟型模板
const virtualTemplates = [
	{ name: "会员订阅", description: "年度会员", refUrl: "https://example.com" },
	{ name: "域名", description: "网站域名", refUrl: "https://example.com" },
	{ name: "云存储", description: "网盘会员", refUrl: "https://example.com" },
	{ name: "软件授权", description: "正版授权", refUrl: "https://example.com" },
];

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

	const createdSpaces = await prisma.space.createManyAndReturn({
		data: spaces.map((s, index) => ({ ...s, userId: admin.id, order: index })),
	});

	const baseTime = new Date();
	const oneDay = 24 * 60 * 60 * 1000;
	const soon = (d: number) => new Date(baseTime.getTime() + d * oneDay);
	const past = (d: number) => new Date(baseTime.getTime() - d * oneDay);

	for (let sIdx = 0; sIdx < createdSpaces.length; sIdx++) {
		const space = createdSpaces[sIdx];
		const spaceName = spaces[sIdx].name;
		const toCreate: Prisma.AssetCreateManyInput[] = [];
		// 每个空间从 0 开始排布，物品集中在原点附近，进入页面即可看见
		let spaceLayoutIndex = 0;

		// STATIC：每空间至少 4 个，按布局索引排布，尺寸不一
		const numStatic = 4 + (sIdx % 3);
		for (let i = 0; i < numStatic; i++) {
			const t = staticTemplates[(sIdx + i) % staticTemplates.length];
			const { x, y } = layoutAt(spaceLayoutIndex);
			const { width, height } = sizeAt(spaceLayoutIndex);
			spaceLayoutIndex++;
			toCreate.push({
				spaceId: space.id,
				name: sIdx > 0 ? `${t.name}-${spaceName}` : t.name,
				description: t.description,
				kind: AssetKind.STATIC,
				state: AssetState.ACTIVE,
				isDeleted: false,
				x,
				y,
				width,
				height,
			});
		}

		// CONSUMABLE：每空间至少 6 个
		const numConsumable = 6 + (sIdx % 5);
		for (let i = 0; i < numConsumable; i++) {
			const t = consumableTemplates[(sIdx * 3 + i) % consumableTemplates.length];
			const state = (t as { state?: AssetState }).state ?? AssetState.ACTIVE;
			const { x, y } = layoutAt(spaceLayoutIndex);
			const { width, height } = sizeAt(spaceLayoutIndex);
			spaceLayoutIndex++;
			toCreate.push({
				spaceId: space.id,
				name: sIdx > 0 ? `${t.name}-${spaceName}` : t.name,
				description: t.description,
				kind: AssetKind.CONSUMABLE,
				state,
				isDeleted: false,
				quantity: t.quantity,
				unit: t.unit,
				reorderPoint: t.reorderPoint,
				consumeIntervalDays: (t as { consumeIntervalDays?: number }).consumeIntervalDays ?? null,
				consumeAmountPerTime: (t as { consumeAmountPerTime?: number }).consumeAmountPerTime ?? null,
				x,
				y,
				width,
				height,
			});
		}

		// TEMPORAL：每空间至少 2 个
		const numTemporal = 2 + (sIdx % 2);
		for (let i = 0; i < numTemporal; i++) {
			const t = temporalTemplates[(sIdx + i) % temporalTemplates.length];
			const nextDue = i === 0 ? past(2) : i === 1 ? soon(5) : soon(30);
			const { x, y } = layoutAt(spaceLayoutIndex);
			const { width, height } = sizeAt(spaceLayoutIndex);
			spaceLayoutIndex++;
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}-${spaceName}`,
				description: t.description,
				kind: AssetKind.TEMPORAL,
				state: AssetState.ACTIVE,
				isDeleted: false,
				lastDoneAt: past(100),
				nextDueAt: nextDue,
				x,
				y,
				width,
				height,
			});
		}

		// VIRTUAL：每个空间至少 1 个，保证所有空间都有物品
		const numVirtual = 1 + (sIdx % 2);
		for (let i = 0; i < numVirtual; i++) {
			const t = virtualTemplates[(sIdx + i) % virtualTemplates.length];
			const expiresAt = sIdx === 0 && i === 0 ? past(1) : soon(30 + sIdx * 10);
			const { x, y } = layoutAt(spaceLayoutIndex);
			const { width, height } = sizeAt(spaceLayoutIndex);
			spaceLayoutIndex++;
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}-${spaceName}`,
				description: t.description,
				kind: AssetKind.VIRTUAL,
				state: AssetState.ACTIVE,
				isDeleted: false,
				refUrl: t.refUrl,
				expiresAt,
				x,
				y,
				width,
				height,
			});
		}

		// 兜底：若本空间没有任何物品则塞一条，避免空空间
		if (toCreate.length === 0) {
			const { x, y } = layoutAt(spaceLayoutIndex);
			const { width, height } = sizeAt(spaceLayoutIndex);
			spaceLayoutIndex++;
			toCreate.push({
				spaceId: space.id,
				name: `默认物品-${spaceName}`,
				description: "种子兜底",
				kind: AssetKind.STATIC,
				state: AssetState.ACTIVE,
				isDeleted: false,
				x,
				y,
				width,
				height,
			});
		}

		await prisma.asset.createMany({ data: toCreate });
	}

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

	for (const space of createdSpaces) {
		const spaceAssets = assetsBySpace.filter((a) => a.spaceId === space.id);
		const consumables = spaceAssets.filter((a) => a.kind === AssetKind.CONSUMABLE);
		const temporals = spaceAssets.filter((a) => a.kind === AssetKind.TEMPORAL);
		const virtuals = spaceAssets.filter((a) => a.kind === AssetKind.VIRTUAL);

		// 历史：AUTO_CONSUME / RESTOCK / REMIND 若干
		for (let i = 0; i < Math.min(5, consumables.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: consumables[i].id,
				type: ActionType.AUTO_CONSUME,
				status: ActionStatus.DONE,
				dueAt: null,
				createdAt: past(14 + i),
			});
		}
		for (let i = 0; i < Math.min(4, consumables.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: consumables[i].id,
				type: ActionType.RESTOCK,
				status: ActionStatus.DONE,
				dueAt: null,
				createdAt: past(10 + i),
			});
		}
		for (let i = 0; i < Math.min(3, temporals.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: temporals[i].id,
				type: ActionType.REMIND,
				status: i === 0 ? ActionStatus.DONE : ActionStatus.SKIPPED,
				dueAt: temporals[i].nextDueAt,
				createdAt: past(5 + i),
			});
		}
		for (const a of virtuals) {
			actionRows.push({
				spaceId: space.id,
				assetId: a.id,
				type: ActionType.REMIND,
				status: ActionStatus.DONE,
				dueAt: a.expiresAt,
				createdAt: past(3),
			});
		}

		// OPEN：每空间多几条 RESTOCK/REMIND/DISCARD，保证待办页有内容
		const pendingRestock = consumables.filter(
			(a) => a.state === AssetState.PENDING_RESTOCK || (a.quantity != null && a.reorderPoint != null && a.quantity <= a.reorderPoint)
		);
		const pendingRemind = temporals.filter((a) => a.nextDueAt && a.nextDueAt <= soon(14));
		const pendingDiscard = consumables.filter((a) => a.quantity === 0);

		for (let i = 0; i < Math.min(4, pendingRestock.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: pendingRestock[i].id,
				type: ActionType.RESTOCK,
				status: ActionStatus.OPEN,
				dueAt: null,
				createdAt: baseTime,
			});
		}
		for (let i = 0; i < Math.min(2, pendingRemind.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: pendingRemind[i].id,
				type: ActionType.REMIND,
				status: ActionStatus.OPEN,
				dueAt: pendingRemind[i].nextDueAt ?? null,
				createdAt: baseTime,
			});
		}
		for (let i = 0; i < Math.min(2, pendingDiscard.length); i++) {
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

	// 再补几条 OPEN，确保待办页有足够卡片
	const firstSpace = createdSpaces[0];
	const extraConsumable = assetsBySpace.filter((a) => a.kind === AssetKind.CONSUMABLE && a.spaceId === firstSpace.id);
	const extraTemporal = assetsBySpace.filter((a) => a.kind === AssetKind.TEMPORAL && a.nextDueAt);
	const openRestockCount = actionRows.filter((r) => r.status === ActionStatus.OPEN && r.type === ActionType.RESTOCK).length;
	const openRemindCount = actionRows.filter((r) => r.status === ActionStatus.OPEN && r.type === ActionType.REMIND).length;
	for (let i = 0; i < Math.min(3, extraConsumable.length) && openRestockCount + i < 12; i++) {
		if (!actionRows.some((r) => r.assetId === extraConsumable[i].id && r.type === ActionType.RESTOCK && r.status === ActionStatus.OPEN)) {
			actionRows.push({
				spaceId: firstSpace.id,
				assetId: extraConsumable[i].id,
				type: ActionType.RESTOCK,
				status: ActionStatus.OPEN,
				dueAt: null,
				createdAt: baseTime,
			});
		}
	}
	for (let i = 0; i < Math.min(2, extraTemporal.length) && openRemindCount + i < 8; i++) {
		const a = extraTemporal[i];
		if (!actionRows.some((r) => r.assetId === a.id && r.type === ActionType.REMIND && r.status === ActionStatus.OPEN)) {
			actionRows.push({
				spaceId: a.spaceId,
				assetId: a.id,
				type: ActionType.REMIND,
				status: ActionStatus.OPEN,
				dueAt: a.nextDueAt,
				createdAt: baseTime,
			});
		}
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
	const assetCount = await prisma.asset.count();
	console.log(`DB Seed: Finished (${(t1 - t0).toFixed(0)}ms)`);
	console.log(`  Users: ${createdUsers.length}, Spaces: ${createdSpaces.length}, Assets: ${assetCount}, Actions: ${actionRows.length}`);
};

seed()
	.then(() => pool.end())
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
