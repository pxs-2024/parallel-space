"use client";

import { useEffect, useRef, useState } from "react";
import { DRAG_THRESHOLD_PX, MAX_CANVAS_SIZE, SIZE } from "./constants";
import type { Cell, DragMode, Item, Space } from "./types";
import {
	cellsToBorderSegments,
	clampCell,
	isConnected,
	isValidCell,
	keyOf,
	unionCells,
	subtractCells,
	clamp,
	getCanvasPixelSize,
	buildCellsInRect,
} from "./utils";
import { Button } from "@/components/ui/button";

export type FloorPlanPersistCallbacks = {
	onCreate: (name: string, cells: Cell[]) => void | Promise<void>;
	onUpdate: (spaceId: string, cells: Cell[]) => void | Promise<void>;
	onSpaceSelect: (spaceId: string) => void;
};

type CanvasGridSelectorProps = {
	/** 外部传入的空间（持久化模式）；有值时以之为准并同步 */
	initialSpaces?: Space[] | null;
	/** 持久化回调：新建/移动/点击空间时调用 */
	persistCallbacks?: FloorPlanPersistCallbacks | null;
	/** 为 true 时不显示物品列表侧栏 */
	noItems?: boolean;
};

/**
 * CanvasGridSelector - 物品管理平面图
 *
 * 功能：在平面图上划分空间（房间/区域），并在各空间下管理物品。
 * - 空间：由网格圈选形成，可拖动调整范围
 * - 物品：归属某一空间，支持名称与数量
 * - 支持 persistCallbacks：与后端同步，不显示物品侧栏时可设 noItems
 */
const CanvasGridSelector = (props: CanvasGridSelectorProps) => {
	const {
		initialSpaces = null,
		persistCallbacks = null,
		noItems = false,
	} = props;

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	const [selected, setSelected] = useState<Cell[]>([]);
	const [spaces, setSpaces] = useState<Space[]>(initialSpaces ?? []);
	const [items, setItems] = useState<Item[]>([]);
	const [error, setError] = useState("");

	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

	// 持久化模式：仅当 initialSpaces 内容变化时同步，避免引用每次都是新数组导致反复 setState 引发无限重渲染
	useEffect(() => {
		if (initialSpaces == null) return;
		if (initialSpaces.length === 0) {
			setSpaces([]);
			return;
		}
		setSpaces((prev) => {
			if (prev.length !== initialSpaces.length) return initialSpaces;
			const prevKey = prev.map((s) => s.id).join(",");
			const nextKey = initialSpaces.map((s) => s.id).join(",");
			return prevKey === nextKey ? prev : initialSpaces;
		});
	}, [initialSpaces]);

	const selectedRef = useRef<Cell[]>([]);
	const spacesRef = useRef<Space[]>([]);
	selectedRef.current = selected;
	spacesRef.current = spaces;

	const selectedSpaceIdRef = useRef<string | null>(null);
	selectedSpaceIdRef.current = selectedSpaceId;

	const hoverSpaceIdRef = useRef<string | null>(null);
	const spaceCellSetRef = useRef<Map<string, Set<string>>>(new Map());

	// 视口变换参数（平移和缩放）
	const viewRef = useRef({ translateX: 0, translateY: 0, scale: 1 });
	// 视口尺寸
	const viewportRef = useRef({ width: 800, height: 600 });

	// 空格键按下状态
	const spaceRef = useRef(false);

	// 右侧工具模式：选择（圈选加选）、取消（圈选减选）、null（默认行为）
	type ToolMode = "select" | "deselect" | null;
	const [toolMode, setToolMode] = useState<ToolMode>(null);
	const toolModeRef = useRef<ToolMode>(null);
	toolModeRef.current = toolMode;

	// 拖拽状态管理

	const dragStateRef = useRef<{
		mode: DragMode; // 当前拖拽模式
		startScreenX: number; // 开始拖拽时的屏幕X坐标
		startScreenY: number; // 开始拖拽时的屏幕Y坐标

		baseTranslateX: number; // 基准平移X值
		baseTranslateY: number; // 基准平移Y值

		startCell: Cell | null; // 开始拖拽时的单元格
		currentCell: Cell | null; // 当前鼠标位置对应的单元格

		spaceId: string | null; // 拖拽的空间ID
		baseSpaceCells: Cell[] | null; // 拖拽开始时空间的原始单元格

		activated: boolean; // 是否已激活拖拽（超过阈值）

		// 本次 pointerdown 时是否按着 shift（锁定，避免中途按/松导致逻辑跳变）
		shiftAtStart: boolean;
		// 框选时为 true 表示从选区中减去，否则为加选
		boxSelectSubtract: boolean;
	}>({
		mode: "none",
		startScreenX: 0,
		startScreenY: 0,
		baseTranslateX: 0,
		baseTranslateY: 0,
		startCell: null,
		currentCell: null,
		spaceId: null,
		baseSpaceCells: null,
		activated: false,
		shiftAtStart: false,
		boxSelectSubtract: false,
	});

	// 请求动画帧重绘管理
	const rafRef = useRef<number | null>(null);
	const pendingRef = useRef(false);

	/**
	 * 调度重绘函数
	 * 使用 requestAnimationFrame 优化重绘性能，避免重复调用
	 */
	/**
	 * 调度重绘函数
	 * 使用 requestAnimationFrame 优化重绘性能，避免重复调用
	 *
	 * 工作原理：
	 * 1. 如果已有待执行的动画帧，标记为 pending，避免重复调度
	 * 2. 否则，请求新的动画帧执行 draw()
	 * 3. 绘制完成后，如果期间有新的绘制请求（pending），则递归调度
	 *
	 * 这样可以确保：
	 * - 绘制频率不超过屏幕刷新率（通常 60fps）
	 * - 多次快速调用会合并为一次绘制
	 * - 不会丢失绘制请求（通过 pending 标记）
	 */
	const scheduleDraw = () => {
		// 如果已经有待执行的动画帧，标记为 pending 并返回
		if (rafRef.current != null) {
			pendingRef.current = true;
			return;
		}

		// 请求新的动画帧
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			draw(); // 执行绘制

			// 如果绘制期间有新的绘制请求，递归调度
			if (pendingRef.current) {
				pendingRef.current = false;
				scheduleDraw();
			}
		});
	};

	/**
	 * 根据设备像素比调整Canvas尺寸
	 * 确保在高DPI设备上显示清晰的图形
	 */
	const resizeCanvasToDPR = () => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;

		const width = wrap.clientWidth;
		const height = wrap.clientHeight;
		viewportRef.current = { width, height };

		const devicePixelRatio = window.devicePixelRatio || 1;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		canvas.width = Math.floor(width * devicePixelRatio);
		canvas.height = Math.floor(height * devicePixelRatio);
	};

	// 坐标转换工具函数

	/**
	 * 将客户端坐标转换为屏幕坐标
	 * @param clientX 客户端X坐标
	 * @param clientY 客户端Y坐标
	 * @returns 屏幕坐标对象或null（如果超出边界）
	 */
	const getScreenXYFromClient = (clientX: number, clientY: number) => {
		const wrap = wrapRef.current;
		if (!wrap) return null;
		const rect = wrap.getBoundingClientRect();
		const screenX = clientX - rect.left;
		const screenY = clientY - rect.top;
		const { width, height } = viewportRef.current;
		if (screenX < 0 || screenY < 0 || screenX >= width || screenY >= height) return null;
		return { screenX, screenY };
	};

	/**
	 * 将屏幕坐标转换为世界坐标（考虑视口变换）（根据setTransform反推）
	 * @param sx 屏幕X坐标
	 * @param sy 屏幕Y坐标
	 * @returns 世界坐标对象
	 */
	const screenToWorldPx = (screenX: number, screenY: number) => {
		const { translateX, translateY, scale } = viewRef.current;
		// 世界坐标 = (屏幕坐标 - 平移) / 缩放
		return { worldX: (screenX - translateX) / scale, worldY: (screenY - translateY) / scale };
	};

	/**
	 * 将屏幕坐标转换为网格单元格坐标
	 * @param sx 屏幕X坐标
	 * @param sy 屏幕Y坐标
	 * @returns 单元格坐标对象
	 */
	const getCellFromScreen = (screenX: number, screenY: number): Cell => {
		const { worldX, worldY } = screenToWorldPx(screenX, screenY);
		// worldX/Y 是世界坐标（像素），除以 SIZE(10) 得到格子坐标
		const cell = { x: Math.floor(worldX / SIZE), y: Math.floor(worldY / SIZE) };
		return clampCell(cell);
	};

	/**
	 * 将客户端坐标直接转换为网格单元格坐标
	 * @param clientX 客户端X坐标
	 * @param clientY 客户端Y坐标
	 * @returns 单元格坐标对象或null
	 */
	const getCellFromClient = (clientX: number, clientY: number): Cell | null => {
		const screen = getScreenXYFromClient(clientX, clientY);
		if (!screen) return null;
		return getCellFromScreen(screen.screenX, screen.screenY);
	};

	/**
	 * 切换单元格的选中状态
	 * @param c 要切换的单元格
	 */
	const toggleCell = (cell: Cell) => {
		// 限制单元格在画布范围内
		const clampedCell = clampCell(cell);

		setError("");
		setSelected((prev) => {
			const key = keyOf(clampedCell);
			const has = prev.some((prevCell) => keyOf(prevCell) === key);
			return has ? prev.filter((prevCell) => keyOf(prevCell) !== key) : [...prev, clampedCell];
		});
	};

	/**
	 * 通过单元格命中测试，返回最内层空间ID（重叠时选面积最小的）
	 */
	const hitTestInnermostSpaceIdByCell = (cell: Cell): string | null => {
		const clampedCell = clampCell(cell);
		const spaceList = spacesRef.current;
		if (!spaceList.length) return null;
		const map = spaceCellSetRef.current;
		const cellKey = `${clampedCell.x},${clampedCell.y}`;
		let bestId: string | null = null;
		let bestArea = Infinity;
		for (let i = spaceList.length - 1; i >= 0; i--) {
			const space = spaceList[i];
			const set = map.get(space.id);
			if (!set || !set.has(cellKey)) continue;
			const area = space.cells.length;
			if (area < bestArea) {
				bestArea = area;
				bestId = space.id;
			}
		}
		return bestId;
	};

	/**
	 * 通过ID更新空间的单元格范围
	 */
	const updateSpaceById = async (id: string, nextCells: Cell[]) => {
		const clampedCells = nextCells.map(clampCell);
		if (persistCallbacks) {
			await persistCallbacks.onUpdate(id, clampedCells);
			return;
		}
		setSpaces((prev) =>
			prev.map((s) =>
				s.id === id
					? { ...s, cells: clampedCells, segs: cellsToBorderSegments(clampedCells) }
					: s
			)
		);
	};

	/**
	 * 确认创建新空间（将当前选区生成为一个空间）
	 */
	const confirm = async () => {
		const currentSelection = selectedRef.current;
		const invalidCells = currentSelection.filter((cell) => !isValidCell(cell));
		if (invalidCells.length > 0) {
			setError("❌ 选中的区域超出画布范围");
			return;
		}
		if (!isConnected(currentSelection)) {
			setError("❌ 选中的区域必须连续");
			return;
		}
		const cells = currentSelection.map((c) => ({ ...c }));
		if (persistCallbacks) {
			const name = `空间-${spacesRef.current.length + 1}`;
			await persistCallbacks.onCreate(name, cells);
			setSelected([]);
			setError("");
			return;
		}
		const segs = cellsToBorderSegments(currentSelection);
		const id = `space-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const name = `空间-${spacesRef.current.length + 1}`;
		setSpaces((prev) => [
			...prev,
			{ id, name, cells, segs },
		]);
		setSelected([]);
		setError("");
		setSelectedSpaceId(id);
	};

	const clearSelected = () => {
		setSelected([]);
		setError("");
	};

	/**
	 * 清空所有空间及关联物品
	 */
	const clearSpaces = () => {
		setSpaces([]);
		setItems([]);
		setError("");
		hoverSpaceIdRef.current = null;
		setSelectedSpaceId(null);
		scheduleDraw();
	};

	/** 更新空间名称 */
	const updateSpaceName = (id: string, name: string) => {
		setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
	};

	/** 添加物品到当前选中空间 */
	const addItem = () => {
		const sid = selectedSpaceIdRef.current;
		if (!sid) return;
		const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		setItems((prev) => [...prev, { id: itemId, spaceId: sid, name: "未命名物品", quantity: 1 }]);
	};

	/** 更新物品 */
	const updateItem = (itemId: string, patch: Partial<Pick<Item, "name" | "quantity">>) => {
		setItems((prev) =>
			prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i))
		);
	};

	/** 删除物品 */
	const removeItem = (itemId: string) => {
		setItems((prev) => prev.filter((i) => i.id !== itemId));
	};

	/**
	 * 绘制画布内容
	 * 包括网格背景、选中单元格、形状轮廓、悬停效果等
	 */
	const draw = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const devicePixelRatio = window.devicePixelRatio || 1;
		const { width, height } = viewportRef.current;

		// 完全重置变换并清空画布
		ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// 先绘制整个视口的黑色背景
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, width, height);

		// 设置视口变换（平移和缩放）
		const { translateX, translateY, scale } = viewRef.current;
		ctx.setTransform(
			devicePixelRatio * scale,
			0,
			0,
			devicePixelRatio * scale,
			devicePixelRatio * translateX,
			devicePixelRatio * translateY
		);

		// 计算可见区域的世界坐标范围
		const topLeft = screenToWorldPx(0, 0);
		const bottomRight = screenToWorldPx(width, height);
		const minWorldX = topLeft.worldX;
		const maxWorldX = bottomRight.worldX;
		const minWorldY = topLeft.worldY;
		const maxWorldY = bottomRight.worldY;

		// 计算画布边界的世界坐标（4000*4000像素）
		const canvasMinX = 0;
		const canvasMaxX = MAX_CANVAS_SIZE; // 4000像素
		const canvasMinY = 0;
		const canvasMaxY = MAX_CANVAS_SIZE; // 4000像素

		// 绘制画布区域的白色背景（带圆角）
		const cornerRadius = 16 / scale; // 圆角半径，根据缩放调整
		ctx.fillStyle = "#ffffff";
		ctx.beginPath();
		ctx.roundRect(
			canvasMinX,
			canvasMinY,
			canvasMaxX - canvasMinX,
			canvasMaxY - canvasMinY,
			cornerRadius
		);
		ctx.fill();

		// 计算需要绘制的网格范围（限制在画布内）
		// 注意：现在画布是4000*4000像素，但格子大小仍然是SIZE=10
		const minGridX = Math.floor(Math.max(minWorldX, canvasMinX) / SIZE) - 1;
		const maxGridX = Math.floor(Math.min(maxWorldX, canvasMaxX) / SIZE) + 1;
		const minGridY = Math.floor(Math.max(minWorldY, canvasMinY) / SIZE) - 1;
		const maxGridY = Math.floor(Math.min(maxWorldY, canvasMaxY) / SIZE) + 1;

		// 绘制网格线（只在画布范围内绘制）
		ctx.lineWidth = 1 / scale;
		ctx.strokeStyle = "#ff000012";
		ctx.beginPath();
		for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
			const x = gridX * SIZE;
			// 只在画布范围内绘制竖线
			if (x >= canvasMinX && x <= canvasMaxX) {
				ctx.moveTo(x, Math.max(minWorldY, canvasMinY));
				ctx.lineTo(x, Math.min(maxWorldY, canvasMaxY));
			}
		}
		for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
			const y = gridY * SIZE;
			// 只在画布范围内绘制横线
			if (y >= canvasMinY && y <= canvasMaxY) {
				ctx.moveTo(Math.max(minWorldX, canvasMinX), y);
				ctx.lineTo(Math.min(maxWorldX, canvasMaxX), y);
			}
		}
		ctx.stroke();

		// 绘制选中的单元格
		const selectedCells = selectedRef.current;
		if (selectedCells.length) {
			ctx.fillStyle = "rgba(59,130,246,0.85)";
			for (const cell of selectedCells) {
				// 只绘制在画布范围内的单元格（4000*4000像素范围内）
				if (isValidCell(cell)) {
					ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
				}
			}
		}

		// 绘制所有形状的轮廓
		const spaceList = spacesRef.current;
		if (spaceList.length) {
			ctx.lineWidth = 2 / scale;
			ctx.strokeStyle = "#2563eb";
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			for (const space of spaceList) {
				if (space.segs.length === 0) continue;
				for (const path of space.segs) {
					if (path.length === 0) continue;
					ctx.beginPath();
					const first = path[0];
					ctx.moveTo(first.x1 * SIZE, first.y1 * SIZE);
					ctx.lineTo(first.x2 * SIZE, first.y2 * SIZE);
					for (let i = 1; i < path.length; i++) {
						ctx.lineTo(path[i].x2 * SIZE, path[i].y2 * SIZE);
					}
					ctx.closePath();
					ctx.stroke();
				}
			}
		}

		const hoverId = hoverSpaceIdRef.current;
		if (hoverId) {
			const hoverSpace = spaceList.find((s) => s.id === hoverId);
			if (hoverSpace && hoverSpace.segs.length > 0) {
				ctx.fillStyle = "rgba(37,99,235,0.10)";
				for (const cell of hoverSpace.cells) {
					if (isValidCell(cell)) {
						ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
					}
				}
				ctx.lineWidth = 4 / scale;
				ctx.strokeStyle = "#1d4ed8";
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				for (const path of hoverSpace.segs) {
					if (path.length === 0) continue;
					ctx.beginPath();
					ctx.moveTo(path[0].x1 * SIZE, path[0].y1 * SIZE);
					ctx.lineTo(path[0].x2 * SIZE, path[0].y2 * SIZE);
					for (let i = 1; i < path.length; i++) {
						ctx.lineTo(path[i].x2 * SIZE, path[i].y2 * SIZE);
					}
					ctx.closePath();
					ctx.stroke();
				}
			}
		}

		const selectedSpaceIdValue = selectedSpaceIdRef.current;
		if (selectedSpaceIdValue) {
			const selectedSpace = spaceList.find((s) => s.id === selectedSpaceIdValue);
			if (selectedSpace && selectedSpace.segs.length > 0) {
				ctx.lineWidth = 5 / scale;
				ctx.strokeStyle = "rgba(0,0,0,0.35)";
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				for (const path of selectedSpace.segs) {
					if (path.length === 0) continue;
					ctx.beginPath();
					ctx.moveTo(path[0].x1 * SIZE, path[0].y1 * SIZE);
					ctx.lineTo(path[0].x2 * SIZE, path[0].y2 * SIZE);
					for (let i = 1; i < path.length; i++) {
						ctx.lineTo(path[i].x2 * SIZE, path[i].y2 * SIZE);
					}
					ctx.closePath();
					ctx.stroke();
				}
			}
		}

		// 绘制框选单元格的覆盖层（激活状态）
		const state = dragStateRef.current;
		if (
			state.mode === "boxSelectCells" &&
			state.activated &&
			state.startCell &&
			state.currentCell
		) {
			const startCell = clampCell(state.startCell);
			const endCell = clampCell(state.currentCell);
			const minX = Math.min(startCell.x, endCell.x);
			const maxX = Math.max(startCell.x, endCell.x);
			const minY = Math.min(startCell.y, endCell.y);
			const maxY = Math.max(startCell.y, endCell.y);

			const left = minX * SIZE;
			const top = minY * SIZE;
			const rectWidth = (maxX - minX + 1) * SIZE;
			const rectHeight = (maxY - minY + 1) * SIZE;

			// 只在画布范围内绘制框选覆盖层
			if (
				left >= canvasMinX &&
				left + rectWidth <= canvasMaxX &&
				top >= canvasMinY &&
				top + rectHeight <= canvasMaxY
			) {
				ctx.fillStyle = "rgba(37,99,235,0.10)";
				ctx.strokeStyle = "#2563eb";
				ctx.lineWidth = 1 / scale;
				ctx.fillRect(left, top, rectWidth, rectHeight);
				ctx.strokeRect(left, top, rectWidth, rectHeight);
			}
		}
	};

	/**
	 * 鼠标滚轮事件处理
	 * Ctrl/Cmd + 滚轮：缩放（以鼠标位置为中心）
	 * 其他：平移
	 * screenX,screenY = wordX * scale + tarnslate
	 */
	const onWheel = (e: React.WheelEvent) => {
		const screen = getScreenXYFromClient(e.clientX, e.clientY);
		if (!screen) return;

		const { screenX, screenY } = screen;
		const { translateX, translateY, scale } = viewRef.current;

		// 滚轮直接缩放（以鼠标位置为中心）
		const worldX = (screenX - translateX) / scale;
		const worldY = (screenY - translateY) / scale;
		const zoomFactor = Math.exp(-e.deltaY * 0.001);
		const nextScale = clamp(scale * zoomFactor, 0.25, 8);
		const nextTranslateX = screenX - worldX * nextScale;
		const nextTranslateY = screenY - worldY * nextScale;

		viewRef.current = {
			translateX: nextTranslateX,
			translateY: nextTranslateY,
			scale: nextScale,
		};
		scheduleDraw();
	};

	/** 回到中心：将视口重置为画布居中、初始缩放 */
	const resetViewToCenter = () => {
		const { width, height } = viewportRef.current;
		const canvasSize = getCanvasPixelSize();
		const initialScale = Math.min(width / canvasSize.width, height / canvasSize.height);
		const canvasCenterX = canvasSize.width / 2;
		const canvasCenterY = canvasSize.height / 2;
		const reasonableScale = Math.max(0.5, initialScale);
		viewRef.current = {
			translateX: width / 2 - canvasCenterX * reasonableScale,
			translateY: height / 2 - canvasCenterY * reasonableScale,
			scale: reasonableScale,
		};
		scheduleDraw();
	};

	// 初始化和尺寸调整
	useEffect(() => {
		// 初始化Canvas和视口
		resizeCanvasToDPR();
		const { width, height } = viewportRef.current;

		// 画布像素计算说明：
		// - 画布尺寸：4000 × 4000 像素
		// - 每个格子：10 × 10 像素
		// - 总格子数：400 × 400 个
		// - 画布世界坐标范围：(0, 0) 到 (4000, 4000)

		// 设置初始视口为中心，缩放级别适合显示4000*4000像素的画布
		const canvasSize = getCanvasPixelSize();
		const initialScale = Math.min(width / canvasSize.width, height / canvasSize.height);

		// 计算画布中心的世界坐标
		const canvasCenterX = canvasSize.width / 2; // 2000
		const canvasCenterY = canvasSize.height / 2; // 2000

		// 设置视口变换，使画布中心对齐到屏幕中心
		// screenX = worldX * scale + translateX
		// 要使画布中心(2000, 2000)显示在屏幕中心(width/2, height/2)
		// translateX = screenX - worldX * scale = width/2 - 2000 * scale
		// translateY = screenY - worldY * scale = height/2 - 2000 * scale

		// 修复：使用合理的初始缩放级别，避免格子过小
		const reasonableScale = Math.max(0.5, initialScale); // 最小缩放0.5，确保格子不会太小

		viewRef.current = {
			translateX: width / 2 - canvasCenterX * reasonableScale,
			translateY: height / 2 - canvasCenterY * reasonableScale,
			scale: reasonableScale,
		};
		draw();

		// 窗口尺寸变化处理
		const onResize = () => {
			resizeCanvasToDPR();
			draw();
		};
		window.addEventListener("resize", onResize);

		// 使用ResizeObserver监听容器尺寸变化
		const resizeObserver =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(() => {
						resizeCanvasToDPR();
						draw();
				  })
				: null;
		if (resizeObserver && wrapRef.current) resizeObserver.observe(wrapRef.current);

		// 清理函数
		return () => {
			window.removeEventListener("resize", onResize);
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			if (resizeObserver) resizeObserver.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const map = new Map<string, Set<string>>();
		for (const space of spaces) {
			map.set(space.id, new Set(space.cells.map((cell) => `${cell.x},${cell.y}`)));
		}
		spaceCellSetRef.current = map;
		if (hoverSpaceIdRef.current) {
			const exists = spaces.some((s) => s.id === hoverSpaceIdRef.current);
			if (!exists) hoverSpaceIdRef.current = null;
		}
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [spaces]);

	useEffect(() => {
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected, selectedSpaceId]);

	// space key
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				e.preventDefault();
				spaceRef.current = true;
			}
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") spaceRef.current = false;
		};
		window.addEventListener("keydown", onKeyDown, { passive: false });
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	// 指针事件处理函数

	/**
	 * 指针按下事件处理
	 * 根据按键状态和鼠标位置确定拖拽模式
	 */
	const onPointerDown = (e: React.PointerEvent) => {
		setError("");
		// 只处理左键点击
		if (e.button !== 0) return;

		const screen = getScreenXYFromClient(e.clientX, e.clientY);
		if (!screen) return;

		// 设置指针捕获
		(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

		// Space键：进入平移模式
		if (spaceRef.current) {
			dragStateRef.current = {
				mode: "pan",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell: null,
				currentCell: null,
				spaceId: null,
				baseSpaceCells: null,
				activated: true,
				shiftAtStart: false,
				boxSelectSubtract: false,
			};
			return;
		}

		const startCell = getCellFromScreen(screen.screenX, screen.screenY);
		const shift = e.shiftKey;
		const tool = toolModeRef.current;

		if (tool === "select" || tool === "deselect") {
			dragStateRef.current = {
				mode: "boxSelectCells",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell,
				currentCell: startCell,
				spaceId: null,
				baseSpaceCells: null,
				activated: false,
				shiftAtStart: true, // 与 shift 行为一致：拖拽应用框选
				boxSelectSubtract: tool === "deselect",
			};
			return;
		}

		// Shift键：强制进入框选单元格模式（加选）
		if (shift) {
			dragStateRef.current = {
				mode: "boxSelectCells",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell,
				currentCell: startCell,
				spaceId: null,
				baseSpaceCells: null,
				activated: false,
				shiftAtStart: true,
				boxSelectSubtract: false,
			};
			return;
		}

		const hitId = hitTestInnermostSpaceIdByCell(startCell);
		if (hitId) {
			const space = spacesRef.current.find((s) => s.id === hitId);
			dragStateRef.current = {
				mode: "moveShape",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell,
				currentCell: startCell,
				spaceId: hitId,
				baseSpaceCells: space ? space.cells.map((cell) => ({ ...cell })) : null,
				activated: false,
				shiftAtStart: false,
				boxSelectSubtract: false,
			};
			hoverSpaceIdRef.current = hitId;
			scheduleDraw();
			return;
		}

		dragStateRef.current = {
			mode: "boxSelectCells",
			startScreenX: screen.screenX,
			startScreenY: screen.screenY,
			baseTranslateX: viewRef.current.translateX,
			baseTranslateY: viewRef.current.translateY,
			startCell,
			currentCell: startCell,
			spaceId: null,
			baseSpaceCells: null,
			activated: false,
			shiftAtStart: false,
			boxSelectSubtract: false,
		};
	};

	/**
	 * 指针移动事件处理
	 * 根据当前拖拽模式执行相应的操作
	 */
	const onPointerMove = (e: React.PointerEvent) => {
		const state = dragStateRef.current;

		// 非拖拽状态：处理悬停效果
		if (state.mode === "none") {
			const cell = getCellFromClient(e.clientX, e.clientY);
			const nextHoverId = cell ? hitTestInnermostSpaceIdByCell(cell) : null;
			if (hoverSpaceIdRef.current !== nextHoverId) {
				hoverSpaceIdRef.current = nextHoverId;
				scheduleDraw();
			}
			return;
		}

		const screen = getScreenXYFromClient(e.clientX, e.clientY);
		if (!screen) return;

		// 平移模式
		if (state.mode === "pan") {
			const deltaX = screen.screenX - state.startScreenX;
			const deltaY = screen.screenY - state.startScreenY;
			viewRef.current = {
				...viewRef.current,
				translateX: state.baseTranslateX + deltaX,
				translateY: state.baseTranslateY + deltaY,
			};
			scheduleDraw();
			return;
		}

		// 计算拖拽距离，判断是否激活拖拽
		const deltaXPixels = screen.screenX - state.startScreenX;
		const deltaYPixels = screen.screenY - state.startScreenY;
		const distance = Math.hypot(deltaXPixels, deltaYPixels);

		if (!state.activated && distance >= DRAG_THRESHOLD_PX) state.activated = true;

		const currentCell = getCellFromScreen(screen.screenX, screen.screenY);
		state.currentCell = currentCell;

		// 移动形状模式（非shift才可能进入）
		if (
			state.mode === "moveShape" &&
			state.activated &&
			state.spaceId &&
			state.startCell &&
			state.baseSpaceCells
		) {
			const deltaCellX = currentCell.x - state.startCell.x;
			const deltaCellY = currentCell.y - state.startCell.y;
			const movedCells = state.baseSpaceCells.map((cell) => ({
				x: cell.x + deltaCellX,
				y: cell.y + deltaCellY,
			}));
			updateSpaceById(state.spaceId, movedCells);
			hoverSpaceIdRef.current = state.spaceId;
			scheduleDraw();
			return;
		}

		// 框选单元格模式（shift或空白拖动）
		if (state.mode === "boxSelectCells") {
			scheduleDraw();
		}
	};

	/**
	 * 指针释放事件处理
	 * 根据拖拽模式和状态执行相应的点击或拖拽完成操作
	 */
	const onPointerUp = () => {
		const state = dragStateRef.current;
		if (state.mode === "none") return;

		// 移动形状模式
		if (state.mode === "moveShape") {
			if (!state.activated && state.spaceId) {
				setSelectedSpaceId(state.spaceId);
				hoverSpaceIdRef.current = state.spaceId;
				persistCallbacks?.onSpaceSelect(state.spaceId);
			} else if (state.spaceId) {
				setSelectedSpaceId(state.spaceId);
			}
		} else if (state.mode === "boxSelectCells") {
			if (state.shiftAtStart && state.startCell) {
				if (!state.activated) {
					if (toolModeRef.current !== "select" && toolModeRef.current !== "deselect") {
						setSelectedSpaceId(null);
						toggleCell(state.startCell);
					}
				} else if (state.activated && state.currentCell) {
					const batch = buildCellsInRect(state.startCell, state.currentCell);
					if (state.boxSelectSubtract) {
						setSelected((prev) => subtractCells(prev, batch));
					} else {
						setSelected((prev) => unionCells(prev, batch));
					}
				}
			} else {
				if (state.startCell) {
					if (!state.activated) {
						const hitId = hitTestInnermostSpaceIdByCell(state.startCell);
						if (hitId) {
							setSelectedSpaceId(hitId);
							hoverSpaceIdRef.current = hitId;
							persistCallbacks?.onSpaceSelect(hitId);
						} else {
							setSelectedSpaceId(null);
							hoverSpaceIdRef.current = null;
						}
					}
				}
			}
		}

		dragStateRef.current = {
			mode: "none",
			startScreenX: 0,
			startScreenY: 0,
			baseTranslateX: 0,
			baseTranslateY: 0,
			startCell: null,
			currentCell: null,
			spaceId: null,
			baseSpaceCells: null,
			activated: false,
			shiftAtStart: false,
			boxSelectSubtract: false,
		};

		scheduleDraw();
	};

	/**
	 * 指针离开事件处理
	 * 清除悬停状态
	 */
	const onPointerLeave = () => {
		if (dragStateRef.current.mode === "none" && hoverSpaceIdRef.current !== null) {
			hoverSpaceIdRef.current = null;
			scheduleDraw();
		}
	};

	return (
		<div className="flex-1 flex flex-col min-h-0">
			{/* 非持久化模式（如 demo）才显示顶部栏 */}
			{!persistCallbacks && (
				<div className="flex flex-wrap items-center gap-3 shrink-0">
					<button
						onClick={() => void confirm()}
						disabled={!selected.length}
						className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-40"
					>
						新建空间
					</button>
					<button onClick={clearSelected} className="px-4 py-2 rounded border border-gray-300">
						清空选中
					</button>
					<button onClick={clearSpaces} className="px-4 py-2 rounded border border-gray-300">
						清空空间
					</button>
					<button onClick={resetViewToCenter} className="px-4 py-2 rounded border border-gray-300">
						回到中心
					</button>
					{error && <span className="text-red-500">{error}</span>}
				</div>
			)}

			{/* 画布 + 右侧工具 */}
			<div className="flex flex-1 min-h-0">
				<div
					ref={wrapRef}
					className="relative flex-1 border border-border overflow-hidden rounded-md"
				>
					<canvas
						ref={canvasRef}
						className="block touch-none"
						onWheel={onWheel}
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
						onPointerLeave={onPointerLeave}
					/>
				</div>
				{/* 右侧三按钮：选择 / 取消 / 新建空间（项目 Button 风格） */}
				<div className="flex flex-col gap-2 border-l border-border bg-muted/30 px-3 py-3 shrink-0 w-48 overflow-y-auto">
					<Button
						type="button"
						variant={toolMode === "select" ? "default" : "outline"}
						size="sm"
						className="w-full justify-center"
						onClick={() => setToolMode((m) => (m === "select" ? null : "select"))}
					>
						选择
					</Button>
					<Button
						type="button"
						variant={toolMode === "deselect" ? "secondary" : "outline"}
						size="sm"
						className="w-full justify-center"
						onClick={() => setToolMode((m) => (m === "deselect" ? null : "deselect"))}
					>
						取消
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full justify-center"
						disabled={!selected.length}
						onClick={() => void confirm()}
					>
						新建空间
					</Button>
					{error && persistCallbacks && (
						<span className="text-destructive text-xs">{error}</span>
					)}
					{!noItems && selectedSpaceId && (() => {
						const space = spaces.find((s) => s.id === selectedSpaceId);
						const spaceItems = items.filter((i) => i.spaceId === selectedSpaceId);
						if (!space) return null;
						return (
							<div className="flex flex-col gap-2 border-t border-gray-200 pt-3">
								<div className="text-xs font-medium text-gray-500">当前空间</div>
								<input
									type="text"
									value={space.name}
									onChange={(e) => updateSpaceName(space.id, e.target.value)}
									className="px-2 py-1.5 rounded border border-gray-300 text-sm w-full"
									placeholder="空间名称"
								/>
								<div className="text-xs font-medium text-gray-500 mt-1">物品列表</div>
								<button
									type="button"
									onClick={addItem}
									className="px-2 py-1 rounded border border-gray-300 text-sm bg-white"
								>
									+ 添加物品
								</button>
								<ul className="flex flex-col gap-1.5">
									{spaceItems.map((item) => (
										<li
											key={item.id}
											className="flex items-center gap-2 rounded border border-gray-200 bg-white p-2"
										>
											<input
												type="text"
												value={item.name}
												onChange={(e) => updateItem(item.id, { name: e.target.value })}
												className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-transparent hover:border-gray-300 rounded"
											/>
											<input
												type="number"
												min={1}
												value={item.quantity ?? 1}
												onChange={(e) =>
													updateItem(item.id, {
														quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
													})
												}
												className="w-12 px-1 py-1 text-xs border border-gray-200 rounded"
											/>
											<button
												type="button"
												onClick={() => removeItem(item.id)}
												className="text-red-500 hover:text-red-700 text-xs"
											>
												删除
											</button>
										</li>
									))}
								</ul>
							</div>
						);
					})()}
				</div>
			</div>
		</div>
	);
};

export { CanvasGridSelector };
