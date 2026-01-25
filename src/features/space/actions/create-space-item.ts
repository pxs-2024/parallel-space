"use server";

import { prisma } from "@/lib/prisma";

const ROWS = 6;
const COLS = 6;

/** 在根级新建容器 */
export async function createContainer(
	spaceId: string,
	options?: {
		name?: string;
		description?: string;
		orderIndex?: number;
		gridRow?: number | null;
		gridCol?: number | null;
	}
) {
	const space = await prisma.space.findUnique({
		where: { id: spaceId },
		select: { id: true },
	});
	if (!space) return { ok: false as const, error: "space_not_found" };

	let orderIndex = options?.orderIndex;
	if (orderIndex == null) {
		const max = await prisma.spaceItem.findFirst({
			where: { spaceId, containerId: null, isDeleted: false },
			select: { orderIndex: true },
			orderBy: { orderIndex: "desc" },
		});
		orderIndex = max ? max.orderIndex + 1 : 0;
	}

	const gridRow = options?.gridRow ?? null;
	const gridCol = options?.gridCol ?? null;
	if (
		gridRow != null &&
		(gridRow < 0 || gridRow >= ROWS || gridCol == null || gridCol < 0 || gridCol >= COLS)
	) {
		return { ok: false as const, error: "invalid_grid" };
	}
	if (gridRow != null && gridCol != null) {
		const occupant = await prisma.spaceItem.findFirst({
			where: {
				spaceId,
				containerId: null,
				isDeleted: false,
				gridRow,
				gridCol,
			},
			select: { id: true },
		});
		if (occupant) return { ok: false as const, error: "cell_occupied" };
	}

	const name = (options?.name ?? "").trim() || "未命名容器";
	const description = (options?.description ?? "").trim() || "";

	const item = await prisma.spaceItem.create({
		data: {
			spaceId,
			name,
			description,
			type: "container",
			orderIndex,
			gridRow,
			gridCol,
		},
		select: {
			id: true,
			name: true,
			description: true,
			orderIndex: true,
			gridRow: true,
			gridCol: true,
			type: true,
		},
	});

	return {
		ok: true as const,
		item: {
			...item,
			type: "container" as const,
			assets: [] as { id: string; name: string; description: string; orderIndex: number }[],
		},
	};
}

/** 新建物品：根级或放入指定容器 */
export async function createAsset(
	spaceId: string,
	options?: {
		name?: string;
		description?: string;
		containerId?: string | null;
		orderIndex?: number;
		gridRow?: number | null;
		gridCol?: number | null;
	}
) {
	const space = await prisma.space.findUnique({
		where: { id: spaceId },
		select: { id: true },
	});
	if (!space) return { ok: false as const, error: "space_not_found" };

	const containerId = options?.containerId ?? null;

	if (containerId) {
		const container = await prisma.spaceItem.findFirst({
			where: {
				id: containerId,
				spaceId,
				type: "container",
				isDeleted: false,
			},
			select: { id: true },
		});
		if (!container) return { ok: false as const, error: "container_not_found" };
	}

	let orderIndex = options?.orderIndex;
	if (orderIndex == null) {
		if (containerId) {
			const max = await prisma.spaceItem.findFirst({
				where: { containerId, isDeleted: false },
				select: { orderIndex: true },
				orderBy: { orderIndex: "desc" },
			});
			orderIndex = max ? max.orderIndex + 1 : 0;
		} else {
			const max = await prisma.spaceItem.findFirst({
				where: { spaceId, containerId: null, isDeleted: false },
				select: { orderIndex: true },
				orderBy: { orderIndex: "desc" },
			});
			orderIndex = max ? max.orderIndex + 1 : 0;
		}
	}

	const gridRow = containerId ? null : (options?.gridRow ?? null);
	const gridCol = containerId ? null : (options?.gridCol ?? null);
	if (
		gridRow != null &&
		(gridRow < 0 || gridRow >= ROWS || gridCol == null || gridCol < 0 || gridCol >= COLS)
	) {
		return { ok: false as const, error: "invalid_grid" };
	}
	if (gridRow != null && gridCol != null) {
		const occupant = await prisma.spaceItem.findFirst({
			where: {
				spaceId,
				containerId: null,
				isDeleted: false,
				gridRow,
				gridCol,
			},
			select: { id: true },
		});
		if (occupant) return { ok: false as const, error: "cell_occupied" };
	}

	const name = (options?.name ?? "").trim() || "未命名物品";
	const description = (options?.description ?? "").trim() || "";

	const item = await prisma.spaceItem.create({
		data: {
			spaceId,
			containerId,
			name,
			description,
			type: "asset",
			orderIndex,
			gridRow,
			gridCol,
		},
		select: {
			id: true,
			name: true,
			description: true,
			orderIndex: true,
			gridRow: true,
			gridCol: true,
			type: true,
		},
	});

	return {
		ok: true as const,
		item: {
			...item,
			type: "asset" as const,
		},
	};
}
