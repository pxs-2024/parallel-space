"use server";

import { prisma } from "@/lib/prisma";

const COLS = 6;
const ROWS = 6;

/** 网格 → 排序：按 (gridRow, gridCol) 行优先排序，写回 orderIndex，清空 grid 字段 */
export async function switchToSortMode(spaceId: string) {
	const root = await prisma.spaceItem.findMany({
		where: { spaceId, isDeleted: false, containerId: null },
		orderBy: [{ gridRow: "asc" }, { gridCol: "asc" }],
		select: { id: true, gridRow: true, gridCol: true },
	});
	const withGrid = root.filter((r) => r.gridRow != null && r.gridCol != null);
	const withoutGrid = root.filter(
		(r) => r.gridRow == null || r.gridCol == null
	);
	const ordered = [...withGrid, ...withoutGrid];

	await prisma.$transaction([
		prisma.space.update({
			where: { id: spaceId },
			data: { layoutMode: "sort" },
		}),
		...ordered.map((item, i) =>
			prisma.spaceItem.update({
				where: { id: item.id },
				data: { orderIndex: i, gridRow: null, gridCol: null },
			})
		),
	]);
}

/** 排序 → 网格：按 orderIndex 依次填 6x6，(0,0),(0,1),…，(5,5) */
export async function switchToGridMode(spaceId: string) {
	const root = await prisma.spaceItem.findMany({
		where: { spaceId, isDeleted: false, containerId: null },
		orderBy: { orderIndex: "asc" },
		select: { id: true },
	});

	const updates = root.slice(0, ROWS * COLS).map((item, i) => {
		const row = Math.floor(i / COLS);
		const col = i % COLS;
		return prisma.spaceItem.update({
			where: { id: item.id },
			data: { gridRow: row, gridCol: col },
		});
	});
	const rest = root.slice(ROWS * COLS);
	for (const item of rest) {
		updates.push(
			prisma.spaceItem.update({
				where: { id: item.id },
				data: { gridRow: null, gridCol: null },
			})
		);
	}

	await prisma.$transaction([
		prisma.space.update({
			where: { id: spaceId },
			data: { layoutMode: "grid" },
		}),
		...updates,
	]);
}

/** 网格模式下：将 item 放到 (row,col)。若该格已有物品则交换位置 */
export async function moveItemToCell(
	spaceId: string,
	itemId: string,
	row: number,
	col: number
) {
	if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

	const [dragged, occupant] = await Promise.all([
		prisma.spaceItem.findFirst({
			where: { id: itemId, spaceId, containerId: null, isDeleted: false },
			select: { id: true, gridRow: true, gridCol: true },
		}),
		prisma.spaceItem.findFirst({
			where: {
				spaceId,
				containerId: null,
				isDeleted: false,
				gridRow: row,
				gridCol: col,
			},
			select: { id: true },
		}),
	]);
	if (!dragged) return;

	if (occupant && occupant.id !== itemId) {
		await prisma.$transaction([
			prisma.spaceItem.update({
				where: { id: itemId },
				data: { gridRow: row, gridCol: col },
			}),
			prisma.spaceItem.update({
				where: { id: occupant.id },
				data: {
					gridRow: dragged.gridRow ?? 0,
					gridCol: dragged.gridCol ?? 0,
				},
			}),
		]);
	} else {
		await prisma.spaceItem.update({
			where: { id: itemId },
			data: { gridRow: row, gridCol: col },
		});
	}
}

/** 网格模式下：将容器内 asset 移到根级 (row,col)；仅支持空单元格 */
export async function moveFromContainerToGridCell(
	spaceId: string,
	assetId: string,
	fromContainerId: string,
	row: number,
	col: number
) {
	if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

	const occupant = await prisma.spaceItem.findFirst({
		where: {
			spaceId,
			containerId: null,
			isDeleted: false,
			gridRow: row,
			gridCol: col,
		},
		select: { id: true },
	});
	if (occupant) return;

	const ok = await prisma.spaceItem.findFirst({
		where: {
			id: assetId,
			containerId: fromContainerId,
			spaceId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!ok) return;

	await prisma.spaceItem.update({
		where: { id: assetId },
		data: { containerId: null, gridRow: row, gridCol: col },
	});
}

/** 网格模式：批量保存所有根级 items 的 gridRow/gridCol */
export async function saveGridLayout(
	spaceId: string,
	updates: Array<{ id: string; gridRow: number | null; gridCol: number | null }>
) {
	await prisma.$transaction(
		updates.map(({ id, gridRow, gridCol }) =>
			prisma.spaceItem.update({
				where: { id },
				data: { gridRow, gridCol },
			})
		)
	);
}

/** 将根级 asset 移动到容器中 */
export async function moveAssetToContainer(
	spaceId: string,
	assetId: string,
	containerId: string
) {
	// 检查 asset 是否存在且是根级的
	const asset = await prisma.spaceItem.findFirst({
		where: {
			id: assetId,
			spaceId,
			containerId: null,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!asset) return;

	// 检查容器是否存在
	const container = await prisma.spaceItem.findFirst({
		where: {
			id: containerId,
			spaceId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!container) return;

	// 获取容器内当前最大的 orderIndex
	const maxOrder = await prisma.spaceItem.findFirst({
		where: {
			containerId,
			isDeleted: false,
		},
		select: { orderIndex: true },
		orderBy: { orderIndex: "desc" },
	});

	const newOrderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;

	// 更新 asset 的 containerId 和 orderIndex，清空 gridRow/gridCol
	await prisma.spaceItem.update({
		where: { id: assetId },
		data: {
			containerId,
			orderIndex: newOrderIndex,
			gridRow: null,
			gridCol: null,
		},
	});
}

/** 将容器内的 asset 移动到另一个容器 */
export async function moveAssetBetweenContainers(
	spaceId: string,
	assetId: string,
	fromContainerId: string,
	toContainerId: string
) {
	// 检查 asset 是否在源容器中
	const asset = await prisma.spaceItem.findFirst({
		where: {
			id: assetId,
			spaceId,
			containerId: fromContainerId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!asset) return;

	// 检查目标容器是否存在
	const toContainer = await prisma.spaceItem.findFirst({
		where: {
			id: toContainerId,
			spaceId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!toContainer) return;

	// 获取目标容器内当前最大的 orderIndex
	const maxOrder = await prisma.spaceItem.findFirst({
		where: {
			containerId: toContainerId,
			isDeleted: false,
		},
		select: { orderIndex: true },
		orderBy: { orderIndex: "desc" },
	});

	const newOrderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;

	// 更新 asset 的 containerId 和 orderIndex
	await prisma.spaceItem.update({
		where: { id: assetId },
		data: {
			containerId: toContainerId,
			orderIndex: newOrderIndex,
		},
	});
}

/** 更新容器内 assets 的排序 */
export async function updateContainerAssetsOrder(
	spaceId: string,
	containerId: string,
	assetOrders: Array<{ id: string; orderIndex: number }>
) {
	// 检查容器是否存在
	const container = await prisma.spaceItem.findFirst({
		where: {
			id: containerId,
			spaceId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!container) return;

	// 批量更新 orderIndex
	await prisma.$transaction(
		assetOrders.map(({ id, orderIndex }) =>
			prisma.spaceItem.update({
				where: { id },
				data: { orderIndex },
			})
		)
	);
}

/** 将容器内的 asset 移到根级（排序模式） */
export async function moveAssetFromContainerToRoot(
	spaceId: string,
	assetId: string,
	fromContainerId: string
) {
	// 检查 asset 是否在容器中
	const asset = await prisma.spaceItem.findFirst({
		where: {
			id: assetId,
			spaceId,
			containerId: fromContainerId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!asset) return;

	// 获取根级当前最大的 orderIndex
	const maxOrder = await prisma.spaceItem.findFirst({
		where: {
			spaceId,
			containerId: null,
			isDeleted: false,
		},
		select: { orderIndex: true },
		orderBy: { orderIndex: "desc" },
	});

	const newOrderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;

	// 更新 asset：移到根级，设置 orderIndex，清空 gridRow/gridCol
	await prisma.spaceItem.update({
		where: { id: assetId },
		data: {
			containerId: null,
			orderIndex: newOrderIndex,
			gridRow: null,
			gridCol: null,
		},
	});
}

/** 更新根级 items 的排序 */
export async function updateRootItemsOrder(
	spaceId: string,
	itemOrders: Array<{ id: string; orderIndex: number }>
) {
	// 批量更新根级 items 的 orderIndex
	await prisma.$transaction(
		itemOrders.map(({ id, orderIndex }) =>
			prisma.spaceItem.update({
				where: { id, spaceId, containerId: null },
				data: { orderIndex },
			})
		)
	);
}
