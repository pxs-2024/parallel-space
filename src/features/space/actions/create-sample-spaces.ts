"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

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

/** 画布格点中心约 (100,100)，整体偏移使户型居中（与 seed 一致） */
const CELL_OFFSET = 52;

function shiftCells(cells: Cell[], dx: number, dy: number): Cell[] {
	return cells.map((c) => ({ x: c.x + dx, y: c.y + dy }));
}

/**
 * 生成示例户型：先清除当前用户全部空间及相关数据，再创建一套房间。
 * - 房间形状包含 L 形、凸形等非规则形状
 * - 房间与房间严格临接（共享格点边）或包含关系，无缝隙
 */
export async function createSampleSpaces(): Promise<
	{ ok: true; count: number } | { ok: false; error: string }
> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) return { ok: false, error: "请先登录" };

		const userId = auth.user.id;

		// 1. 清除当前用户所有空间及其关联数据（Asset、Action 依赖 Space）
		const spaceIds = await prisma.space.findMany({ where: { userId }, select: { id: true } }).then((s) => s.map((x) => x.id));
		if (spaceIds.length > 0) {
			await prisma.action.deleteMany({ where: { spaceId: { in: spaceIds } } });
			await prisma.asset.deleteMany({ where: { spaceId: { in: spaceIds } } });
			await prisma.space.deleteMany({ where: { userId } });
		}

		// 2. 户型：格点严格临接，整体偏移 CELL_OFFSET 使户型靠近画布中心 (100,100)
		const spaces: { name: string; description: string; cells: Cell[] }[] = [
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

		await prisma.space.createMany({
			data: spaces.map((s, i) => ({
				name: s.name,
				description: s.description,
				userId,
				order: i,
				cells: s.cells,
			})),
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);
		return { ok: true, count: spaces.length };
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : "生成失败",
		};
	}
}
