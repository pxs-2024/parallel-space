import { prisma } from "@/lib/prisma";

export type SpaceItemAsset = {
	id: string;
	name: string;
	description: string;
	orderIndex: number;
};

export type LayoutMode = "sort" | "grid";

/** 根级单项：asset 或 container；排序模式用 orderIndex，网格模式用 gridRow/gridCol */
export type RootSpaceItem =
	| {
			type: "asset";
			id: string;
			name: string;
			description: string;
			orderIndex: number;
			gridRow: number | null;
			gridCol: number | null;
	  }
	| {
			type: "container";
			id: string;
			name: string;
			description: string;
			orderIndex: number;
			gridRow: number | null;
			gridCol: number | null;
			assets: SpaceItemAsset[];
	  };

export type AssetsAndContainers = {
	id: string;
	name: string;
	description: string;
	layoutMode: LayoutMode;
	items: RootSpaceItem[];
} | null;

export const getAssetsAndContainers = async (
	spaceId: string
): Promise<AssetsAndContainers> => {
	// layoutMode / gridRow / gridCol 需跑 migrate 后存在；select 类型暂放宽
	const space = await prisma.space.findUnique({
		where: { id: spaceId },
		select: {
			id: true,
			name: true,
			description: true,
			layoutMode: true,
			spaceItems: {
				where: { isDeleted: false, containerId: null },
				orderBy: [{ orderIndex: "asc" }],
				select: {
					id: true,
					name: true,
					description: true,
					orderIndex: true,
					gridRow: true,
					gridCol: true,
					type: true,
					assets: {
						where: { isDeleted: false },
						orderBy: { orderIndex: "asc" },
						select: {
							id: true,
							name: true,
							description: true,
							orderIndex: true,
						},
					},
				},
			},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 兼容 migrate 前 schema
		} as any,
	});
	if (!space) return null;

	type RawItem = {
		id: string;
		name: string;
		description: string;
		orderIndex: number;
		gridRow: number | null;
		gridCol: number | null;
		type: "asset" | "container";
		assets: Array<{
			id: string;
			name: string;
			description: string;
			orderIndex: number;
		}>;
	};
	type RawSpace = {
		id: string;
		name: string;
		description: string;
		layoutMode: "sort" | "grid";
		spaceItems: RawItem[];
	};
	const s = space as unknown as RawSpace;
	const raw = s.spaceItems;
	const mode = (s.layoutMode === "grid" ? "grid" : "sort") as LayoutMode;
	const sorted: RawItem[] =
		mode === "grid"
			? [...raw].sort((a, b) => {
					const ar = a.gridRow ?? 999;
					const ac = a.gridCol ?? 999;
					const br = b.gridRow ?? 999;
					const bc = b.gridCol ?? 999;
					return ar !== br ? ar - br : ac - bc;
				})
			: raw;

	const items: RootSpaceItem[] = sorted.map((item: RawItem) => {
		if (item.type === "asset") {
			return {
				type: "asset" as const,
				id: item.id,
				name: item.name,
				description: item.description,
				orderIndex: item.orderIndex,
				gridRow: item.gridRow,
				gridCol: item.gridCol,
			};
		}
		return {
			type: "container" as const,
			id: item.id,
			name: item.name,
			description: item.description,
			orderIndex: item.orderIndex,
			gridRow: item.gridRow,
			gridCol: item.gridCol,
			assets: item.assets.map((a: { id: string; name: string; description: string; orderIndex: number }) => ({
				id: a.id,
				name: a.name,
				description: a.description,
				orderIndex: a.orderIndex,
			})),
		};
	});

	return {
		id: s.id,
		name: s.name,
		description: s.description,
		layoutMode: mode,
		items,
	};
};
