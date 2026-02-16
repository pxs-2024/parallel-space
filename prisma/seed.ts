import "dotenv/config";

import { hash } from "@node-rs/argon2";
import {
	Prisma,
	PrismaClient,
	AssetKind,
	AssetState,
	ActionType,
	ActionStatus,
} from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient();

const users = [
	{ username: "admin", email: "2829791064@qq.com" },
	{ username: "user", email: "hello@vdigital.design" },
];

type Cell = { x: number; y: number };

function rect(minX: number, minY: number, maxX: number, maxY: number): Cell[] {
	const cells: Cell[] = [];
	for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) cells.push({ x, y });
	return cells;
}

function union(...parts: Cell[][]): Cell[] {
	const set = new Set(parts.flatMap((p) => p.map((c) => `${c.x},${c.y}`)));
	return Array.from(set, (s) => {
		const [x, y] = s.split(",").map(Number);
		return { x, y };
	});
}

function shiftCells(cells: Cell[], dx: number, dy: number): Cell[] {
	return cells.map((c) => ({ x: c.x + dx, y: c.y + dy }));
}

const CELL_OFFSET = 52;

const floorPlanSpaces: { name: string; description: string; cells: Cell[] }[] = [
	{ name: "玄关", description: "入户过渡与收纳", cells: shiftCells(rect(5, 5, 22, 28), CELL_OFFSET, CELL_OFFSET) },
	{
		name: "客厅",
		description: "日常休息与会客",
		cells: shiftCells(union(rect(23, 5, 58, 35), rect(59, 25, 72, 35)), CELL_OFFSET, CELL_OFFSET),
	},
	{ name: "卧室", description: "休息与收纳", cells: shiftCells(rect(73, 5, 90, 38), CELL_OFFSET, CELL_OFFSET) },
	{ name: "厨房", description: "烹饪与储物", cells: shiftCells(rect(5, 29, 22, 52), CELL_OFFSET, CELL_OFFSET) },
	{
		name: "餐厅",
		description: "用餐区域",
		cells: shiftCells(union(rect(23, 36, 55, 72), rect(56, 36, 72, 50)), CELL_OFFSET, CELL_OFFSET),
	},
	{ name: "书房", description: "工作与阅读", cells: shiftCells(rect(73, 39, 90, 72), CELL_OFFSET, CELL_OFFSET) },
	{ name: "卫生间", description: "洗漱与卫浴", cells: shiftCells(rect(5, 53, 22, 72), CELL_OFFSET, CELL_OFFSET) },
	{ name: "阳台", description: "晾晒与绿植", cells: shiftCells(rect(5, 73, 90, 92), CELL_OFFSET, CELL_OFFSET) },
];

const staticTemplates: { name: string; description: string }[] = [
	{ name: "书", description: "书房书籍" },
	{ name: "显示器", description: "办公显示器" },
	{ name: "工具箱", description: "常用工具" },
	{ name: "书架", description: "置物架" },
	{ name: "台灯", description: "阅读灯" },
	{ name: "键盘", description: "机械键盘" },
	{ name: "椅子", description: "办公椅" },
	{ name: "收纳盒", description: "桌面收纳" },
];

const consumableTemplates: {
	name: string;
	description: string;
	quantity: number;
	unit?: string;
	reorderPoint?: number;
	consumeIntervalDays?: number;
	consumeAmountPerTime?: number;
	state?: AssetState;
}[] = [
	{ name: "笔记本", description: "消耗型", quantity: 2, unit: "本", reorderPoint: 5 },
	{ name: "笔", description: "签字笔", quantity: 3, unit: "支", reorderPoint: 5, consumeIntervalDays: 30, consumeAmountPerTime: 1 },
	{ name: "抽纸", description: "盒装抽纸", quantity: 1, unit: "盒", reorderPoint: 2 },
	{ name: "洗洁精", description: "厨房用", quantity: 0, unit: "瓶", reorderPoint: 1, state: AssetState.PENDING },
	{ name: "垃圾袋", description: "大号", quantity: 4, unit: "卷", reorderPoint: 2 },
	{ name: "咖啡豆", description: "办公室咖啡", quantity: 1, unit: "袋", reorderPoint: 1, state: AssetState.PENDING },
	{ name: "洗发水", description: "洗护", quantity: 0, unit: "瓶", reorderPoint: 1, state: AssetState.PENDING },
	{ name: "创可贴", description: "药箱常备", quantity: 2, unit: "盒", reorderPoint: 1 },
	{ name: "酱油", description: "厨房调味", quantity: 1, unit: "瓶", reorderPoint: 1 },
	{ name: "牙膏", description: "浴室日耗", quantity: 0, unit: "支", reorderPoint: 1, state: AssetState.PENDING },
	{ name: "便利贴", description: "办公用品", quantity: 3, unit: "本", reorderPoint: 2 },
	{ name: "电池", description: "5号电池", quantity: 0, unit: "节", reorderPoint: 4, state: AssetState.PENDING },
	{ name: "湿巾", description: "婴儿湿巾", quantity: 2, unit: "包", reorderPoint: 1 },
	{ name: "茶叶", description: "绿茶", quantity: 1, unit: "罐", reorderPoint: 1 },
	{ name: "胶带", description: "透明胶带", quantity: 2, unit: "卷", reorderPoint: 1 },
	{ name: "洗衣液", description: "浴室洗护", quantity: 1, unit: "瓶", reorderPoint: 1 },
];

const temporalTemplates: { name: string; description: string }[] = [
	{ name: "滤芯", description: "净水器滤芯" },
	{ name: "空调清洗", description: "年度清洗" },
	{ name: "换季收纳", description: "换季整理" },
	{ name: "车辆保养", description: "机油机滤" },
	{ name: "体检", description: "年度体检" },
	{ name: "保险续费", description: "车险/家险" },
];

async function seed() {
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
		data: floorPlanSpaces.map((s) => ({
			name: s.name,
			description: s.description,
			userId: admin.id,
			cells: s.cells,
		})),
	});

	const baseTime = new Date();
	const oneDay = 24 * 60 * 60 * 1000;
	const soon = (d: number) => new Date(baseTime.getTime() + d * oneDay);
	const past = (d: number) => new Date(baseTime.getTime() - d * oneDay);

	for (let sIdx = 0; sIdx < createdSpaces.length; sIdx++) {
		const space = createdSpaces[sIdx];
		const spaceName = floorPlanSpaces[sIdx].name;
		const toCreate: Prisma.AssetCreateManyInput[] = [];

		const numStatic = 4 + (sIdx % 3);
		for (let i = 0; i < numStatic; i++) {
			const t = staticTemplates[(sIdx + i) % staticTemplates.length];
			toCreate.push({
				spaceId: space.id,
				name: sIdx > 0 ? `${t.name}-${spaceName}` : t.name,
				description: t.description,
				kind: AssetKind.STATIC,
				state: AssetState.ACTIVE,
				isDeleted: false,
			});
		}

		const numConsumable = 6 + (sIdx % 5);
		for (let i = 0; i < numConsumable; i++) {
			const t = consumableTemplates[(sIdx * 3 + i) % consumableTemplates.length];
			toCreate.push({
				spaceId: space.id,
				name: sIdx > 0 ? `${t.name}-${spaceName}` : t.name,
				description: t.description,
				kind: AssetKind.CONSUMABLE,
				state: t.state ?? AssetState.ACTIVE,
				isDeleted: false,
				quantity: t.quantity,
				unit: t.unit ?? null,
				reorderPoint: t.reorderPoint ?? null,
				consumeIntervalDays: t.consumeIntervalDays ?? null,
				consumeAmountPerTime: t.consumeAmountPerTime ?? null,
			});
		}

		const numTemporal = 2 + (sIdx % 2);
		for (let i = 0; i < numTemporal; i++) {
			const t = temporalTemplates[(sIdx + i) % temporalTemplates.length];
			const nextDue = i === 0 ? past(2) : i === 1 ? soon(5) : soon(30);
			toCreate.push({
				spaceId: space.id,
				name: `${t.name}-${spaceName}`,
				description: t.description,
				kind: AssetKind.TEMPORAL,
				state: AssetState.ACTIVE,
				isDeleted: false,
				lastDoneAt: past(100),
				nextDueAt: nextDue,
			});
		}

		if (toCreate.length === 0) {
			toCreate.push({
				spaceId: space.id,
				name: `默认物品-${spaceName}`,
				description: "种子兜底",
				kind: AssetKind.STATIC,
				state: AssetState.ACTIVE,
				isDeleted: false,
			});
		}

		await prisma.asset.createMany({ data: toCreate });
	}

	const assetsBySpace = await prisma.asset.findMany({
		where: { isDeleted: false },
		select: { id: true, spaceId: true, kind: true, state: true, quantity: true, reorderPoint: true },
	});

	const actionRows: {
		spaceId: string;
		assetId: string | null;
		type: ActionType;
		status: ActionStatus;
		dueAt: Date | null;
	}[] = [];

	for (const space of createdSpaces) {
		const spaceAssets = assetsBySpace.filter((a) => a.spaceId === space.id);
		const consumables = spaceAssets.filter((a) => a.kind === AssetKind.CONSUMABLE);

		// 已处理的 RESTOCK
		for (let i = 0; i < Math.min(4, consumables.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: consumables[i].id,
				type: ActionType.RESTOCK,
				status: ActionStatus.DONE,
				dueAt: null,
			});
		}

		// 待处理的 RESTOCK（数量 <= 补货线的消耗型）
		const pendingRestock = consumables.filter(
			(a) =>
				a.state === AssetState.PENDING ||
				(a.quantity != null && a.reorderPoint != null && a.quantity <= a.reorderPoint)
		);
		for (let i = 0; i < Math.min(4, pendingRestock.length); i++) {
			actionRows.push({
				spaceId: space.id,
				assetId: pendingRestock[i].id,
				type: ActionType.RESTOCK,
				status: ActionStatus.OPEN,
				dueAt: null,
			});
		}
	}

	// 补几条 NEW_ASSET（OPEN），用于 AI 建议等
	const firstSpace = createdSpaces[0];
	actionRows.push({
		spaceId: firstSpace.id,
		assetId: null,
		type: ActionType.NEW_ASSET,
		status: ActionStatus.OPEN,
		dueAt: null,
	});
	actionRows.push({
		spaceId: firstSpace.id,
		assetId: null,
		type: ActionType.NEW_ASSET,
		status: ActionStatus.DONE,
		dueAt: null,
	});

	await prisma.action.createMany({
		data: actionRows.map((a) => ({
			spaceId: a.spaceId,
			assetId: a.assetId,
			type: a.type,
			status: a.status,
			dueAt: a.dueAt,
		})),
	});

	const t1 = performance.now();
	const assetCount = await prisma.asset.count();
	const actionCount = await prisma.action.count();
	console.log(`DB Seed: Finished (${(t1 - t0).toFixed(0)}ms)`);
	console.log(`  Users: ${createdUsers.length}, Spaces: ${createdSpaces.length}, Assets: ${assetCount}, Actions: ${actionCount}`);
}

seed()
	.then(() => prisma.$disconnect())
	.catch((e) => {
		console.error(e);
		prisma.$disconnect();
		process.exit(1);
	});
