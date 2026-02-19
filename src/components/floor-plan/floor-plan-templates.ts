export type Cell = { x: number; y: number };

export type FloorPlanTemplateSpace = {
	name: string;
	description: string;
	cells: Cell[];
};

export type FloorPlanTemplate = {
	id: string;
	title: string;
	area: number;
	tags: string[];
	spaces: FloorPlanTemplateSpace[];
};

const CELL_OFFSET = 52;

function rect(minX: number, minY: number, maxX: number, maxY: number): Cell[] {
	const cells: Cell[] = [];
	for (let y = minY; y <= maxY; y++)
		for (let x = minX; x <= maxX; x++) cells.push({ x, y });
	return cells;
}

function shiftCells(cells: Cell[], dx: number, dy: number): Cell[] {
	return cells.map((c) => ({ x: c.x + dx, y: c.y + dy }));
}

export const popularLayouts: FloorPlanTemplate[] = [
	{
		id: "studio-38",
		title: "38㎡ 开间",
		area: 38,
		tags: ["开间", "公寓", "刚需"],
		spaces: [
			{ name: "玄关", description: "入户收纳", cells: shiftCells(rect(5, 5, 20, 20), CELL_OFFSET, CELL_OFFSET) },
			{ name: "起居区", description: "客厅+卧室一体", cells: shiftCells(rect(21, 5, 95, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "开放式厨房", cells: shiftCells(rect(5, 21, 40, 45), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卫生间", description: "干湿一体", cells: shiftCells(rect(5, 46, 40, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "阳台", description: "采光阳台", cells: shiftCells(rect(41, 61, 95, 85), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "1b1l-55",
		title: "55㎡ 一室一厅",
		area: 55,
		tags: ["一室一厅", "刚需"],
		spaces: [
			{ name: "玄关", description: "过渡收纳", cells: shiftCells(rect(5, 5, 20, 22), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "会客休息", cells: shiftCells(rect(21, 5, 95, 40), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卧室", description: "独立卧室", cells: shiftCells(rect(21, 41, 95, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "独立厨房", cells: shiftCells(rect(5, 23, 20, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卫生间", description: "卫浴空间", cells: shiftCells(rect(5, 56, 20, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "阳台", description: "生活阳台", cells: shiftCells(rect(30, 76, 95, 92), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "2b1l-75",
		title: "75㎡ 两室一厅",
		area: 75,
		tags: ["两室一厅", "刚需主力"],
		spaces: [
			{ name: "玄关", description: "入户收纳", cells: shiftCells(rect(5, 5, 22, 20), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "客餐一体", cells: shiftCells(rect(23, 5, 95, 35), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卧", description: "主卧空间", cells: shiftCells(rect(23, 36, 60, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧", description: "儿童房", cells: shiftCells(rect(61, 36, 95, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "L型厨房", cells: shiftCells(rect(5, 21, 22, 50), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卫生间", description: "三分离可改", cells: shiftCells(rect(5, 51, 22, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "阳台", description: "客厅外阳台", cells: shiftCells(rect(40, 76, 95, 92), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "2b2l-89",
		title: "89㎡ 两室两厅",
		area: 89,
		tags: ["两室两厅", "改善"],
		spaces: [
			{ name: "玄关", description: "玄关柜", cells: shiftCells(rect(5, 5, 25, 20), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "独立客厅", cells: shiftCells(rect(26, 5, 95, 35), CELL_OFFSET, CELL_OFFSET) },
			{ name: "餐厅", description: "独立餐厅", cells: shiftCells(rect(26, 36, 70, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卧", description: "大主卧", cells: shiftCells(rect(26, 56, 70, 90), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧", description: "次卧", cells: shiftCells(rect(71, 36, 95, 70), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "U型厨房", cells: shiftCells(rect(5, 21, 25, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卫生间", description: "干湿分离", cells: shiftCells(rect(71, 71, 95, 90), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "3b1l-105",
		title: "105㎡ 三室一厅",
		area: 105,
		tags: ["三室一厅", "刚改"],
		spaces: [
			{ name: "玄关", description: "入户区", cells: shiftCells(rect(5, 5, 22, 20), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "客餐一体", cells: shiftCells(rect(23, 5, 95, 40), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卧", description: "带衣柜", cells: shiftCells(rect(23, 41, 60, 80), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧1", description: "儿童房", cells: shiftCells(rect(61, 41, 95, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧2", description: "书房/客卧", cells: shiftCells(rect(61, 61, 95, 80), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "独立厨房", cells: shiftCells(rect(5, 21, 22, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卫生间", description: "主卫", cells: shiftCells(rect(5, 56, 22, 80), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "3b2l-120",
		title: "120㎡ 三室两厅两卫",
		area: 120,
		tags: ["三室两厅", "改善主流"],
		spaces: [
			{ name: "玄关", description: "大玄关", cells: shiftCells(rect(5, 5, 25, 20), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "大横厅", cells: shiftCells(rect(26, 5, 95, 35), CELL_OFFSET, CELL_OFFSET) },
			{ name: "餐厅", description: "餐客分区", cells: shiftCells(rect(26, 36, 60, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卧", description: "套房主卧", cells: shiftCells(rect(26, 56, 60, 90), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卫", description: "主卧卫", cells: shiftCells(rect(61, 56, 75, 75), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧1", description: "儿童房", cells: shiftCells(rect(76, 36, 95, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧2", description: "客卧", cells: shiftCells(rect(76, 61, 95, 90), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "U型厨房", cells: shiftCells(rect(5, 21, 25, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "公卫", description: "干湿分离", cells: shiftCells(rect(61, 76, 75, 90), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "4b2l-140",
		title: "140㎡ 四室两厅",
		area: 140,
		tags: ["四室", "改善"],
		spaces: [
			{ name: "玄关", description: "入户区", cells: shiftCells(rect(5, 5, 25, 22), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "大客厅", cells: shiftCells(rect(26, 5, 95, 40), CELL_OFFSET, CELL_OFFSET) },
			{ name: "餐厅", description: "独立餐厅", cells: shiftCells(rect(26, 41, 60, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卧", description: "套房", cells: shiftCells(rect(26, 61, 60, 95), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卫", description: "主卧卫", cells: shiftCells(rect(61, 61, 75, 80), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧1", description: "卧室", cells: shiftCells(rect(76, 41, 95, 65), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧2", description: "卧室", cells: shiftCells(rect(76, 66, 95, 80), CELL_OFFSET, CELL_OFFSET) },
			{ name: "次卧3", description: "书房", cells: shiftCells(rect(61, 81, 95, 95), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "中厨", cells: shiftCells(rect(5, 23, 25, 55), CELL_OFFSET, CELL_OFFSET) },
			{ name: "公卫", description: "公卫", cells: shiftCells(rect(5, 56, 25, 80), CELL_OFFSET, CELL_OFFSET) },
		],
	},
	{
		id: "flat-180",
		title: "180㎡ 大平层",
		area: 180,
		tags: ["大平层", "高端"],
		spaces: [
			{ name: "玄关", description: "大尺度玄关", cells: shiftCells(rect(5, 5, 30, 25), CELL_OFFSET, CELL_OFFSET) },
			{ name: "客厅", description: "横厅", cells: shiftCells(rect(31, 5, 95, 40), CELL_OFFSET, CELL_OFFSET) },
			{ name: "餐厅", description: "独立餐厅", cells: shiftCells(rect(31, 41, 65, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卧", description: "主卧套房", cells: shiftCells(rect(31, 61, 65, 95), CELL_OFFSET, CELL_OFFSET) },
			{ name: "主卫", description: "双台盆", cells: shiftCells(rect(66, 61, 80, 80), CELL_OFFSET, CELL_OFFSET) },
			{ name: "衣帽间", description: "Walk-in Closet", cells: shiftCells(rect(81, 61, 95, 80), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卧室2", description: "卧室", cells: shiftCells(rect(66, 41, 95, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "卧室3", description: "卧室", cells: shiftCells(rect(66, 81, 95, 95), CELL_OFFSET, CELL_OFFSET) },
			{ name: "厨房", description: "中西双厨", cells: shiftCells(rect(5, 26, 30, 60), CELL_OFFSET, CELL_OFFSET) },
			{ name: "公卫", description: "客卫", cells: shiftCells(rect(5, 61, 30, 80), CELL_OFFSET, CELL_OFFSET) },
		],
	},
];
