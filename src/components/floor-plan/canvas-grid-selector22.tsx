"use client";

import { useEffect, useRef, useState } from "react";
import { DRAG_THRESHOLD_PX, SIZE } from "./constants";
import type { Cell, DragState, Item, Point, Screen, Space } from "./types";
import { useLatest } from "ahooks";
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
import { useSpaceKeyListener } from "./hooks/useKeyDownLinstener";
import { useScheduleDraw } from "./hooks/useScheduleDraw";
import { useInitAndResizeCanvas } from "./hooks/useInitAndResizeCanvas";
import {
	drawActiveBoxSelectCells,
	drawBoxSelectCells,
	drawHoverSpace,
	drawSelectedCells,
	drawSpaces,
	resetCanvas,
	drawPoint,
} from "./drawUtils";

export type FloorPlanPersistCallbacks = {
	onCreate: (name: string, cells: Cell[]) => void | Promise<void>;
	onUpdate: (spaceId: string, cells: Cell[]) => void | Promise<void>;
	onSpaceSelect: (spaceId: string) => void;
};

type ToolMode = "select" | "deselect" | "cleanSegments" | null;

type CanvasGridSelectorProps = {
	/** 外部传入的空间（持久化模式）；有值时以之为准并同步 */
	initialSpaces?: Space[] | null;
	/** 持久化回调：新建/移动/点击空间时调用 */
	persistCallbacks?: FloorPlanPersistCallbacks | null;
	/** 为 true 时不显示物品列表侧栏 */
	noItems?: boolean;
	/** 编辑模式：为 true 时显示选择/取消/新建空间等按钮；持久化模式下由外部控制 */
	editMode?: boolean;
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
	const { initialSpaces = null, persistCallbacks = null, noItems = false, editMode = true } = props;

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	const [selected, setSelected] = useState<Cell[]>([]);
	const [spaces, setSpaces] = useState<Space[]>(initialSpaces ?? []);
	const [items, setItems] = useState<Item[]>([]);
	const [error, setError] = useState("");

	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

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

	const selectedRef = useLatest<Cell[]>(selected);
	const spacesRef = useLatest<Space[]>(spaces);

	const selectedSpaceIdRef = useLatest<string | null>(selectedSpaceId);

	const hoverSpaceIdRef = useRef<string | null>(null);
	const spaceCellSetRef = useRef<Map<string, Set<string>>>(new Map());

	// 视口变换参数（平移和缩放）
	const viewRef = useRef<{ translateX: number; translateY: number; scale: number }>({
		translateX: 0,
		translateY: 0,
		scale: 1,
	});

	const spaceKeyRef = useSpaceKeyListener();

	// 右侧工具模式：选择（圈选加选）、取消（圈选减选）、null（默认行为）

	const [toolMode, setToolMode] = useState<ToolMode>(null);
	const toolModeRef = useLatest<ToolMode>(toolMode);

	// 退出编辑模式时清除工具模式，避免框选/取消仍生效
	useEffect(() => {
		if (!editMode) setToolMode(null);
	}, [editMode]);

	// 拖拽状态管理

	const dragStateRef = useRef<DragState>({
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
		startPoint: null,
	});

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
	 * 找到离屏幕坐标最近的点坐标
	 * @param screenX 
	 * @param screenY 
	 * @returns 
	 */
	const getPointFromScreen = (screenX: number, screenY: number): Point => {
		const { worldX, worldY } = screenToWorldPx(screenX, screenY);
		const cell = { x: Math.round(worldX / SIZE), y: Math.round(worldY / SIZE) };
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
				s.id === id ? { ...s, cells: clampedCells, segs: cellsToBorderSegments(clampedCells) } : s
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
		setSpaces((prev) => [...prev, { id, name, cells, segs }]);
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
		setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
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

		const { scale } = viewRef.current;
		const spaceList = spacesRef.current;
		resetCanvas(ctx, canvas, viewportRef.current, viewRef.current, screenToWorldPx);
		drawSelectedCells(ctx, selectedRef.current);
		drawSpaces(ctx, spaceList, scale);
		const hoverSpace = spaceList.find((s) => s.id === hoverSpaceIdRef.current);
		if (hoverSpace) drawHoverSpace(ctx, hoverSpace, scale);
		drawBoxSelectCells(ctx, spaceList, selectedSpaceIdRef.current, scale);
		drawActiveBoxSelectCells(ctx, dragStateRef.current, scale);
		console.log(dragStateRef.current,'startPoint');
		drawPoint(ctx, dragStateRef.current.startPoint || {x:0,y:0}, scale);
	};

	const scheduleDraw = useScheduleDraw(draw);
	const viewportRef = useInitAndResizeCanvas(canvasRef, wrapRef, viewRef, scheduleDraw);

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

	// 指针事件处理函数

	const handleEditMode = (screen: Screen, startCell: Cell, tool: ToolMode) => {
		console.log(tool,'tool');
		switch (true) {
			case tool === "select" || tool === "deselect":
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
					boxSelectSubtract: tool === "deselect",
					startPoint: null,
				};
				break;
			case tool === "cleanSegments":
				const startPoint = getPointFromScreen(screen.screenX, screen.screenY);
				console.log(startPoint,'startPoint');

				dragStateRef.current = {
					mode: "cleanSegments",
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
					boxSelectSubtract: tool === "deselect",
					startPoint: startPoint,
				};
				break;
			default:
				break;
		}
		scheduleDraw();
	};

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
		if (spaceKeyRef.current) {
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
		const canEdit = editMode;
		if (canEdit) {
		}
		// 仅编辑模式下允许框选/取消工具
		if (canEdit) {
			handleEditMode(screen, startCell, tool);
		} else {
		}
		return;

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

		// 空白处拖拽：编辑模式下框选，非编辑模式忽略
		if (!canEdit && persistCallbacks) {
			dragStateRef.current = {
				mode: "ignore",
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
		console.log(state.mode,'state');
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
		if(state.mode === "cleanSegments") {
			const currentPoint = getPointFromScreen(e.clientX, e.clientY);
			console.log(currentPoint,'currentPoint');
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

		// 移动形状模式（仅编辑模式下允许拖动改变范围）
		if (
			state.mode === "moveShape" &&
			state.activated &&
			state.spaceId &&
			state.startCell &&
			state.baseSpaceCells &&
			editMode
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
		if (state.mode === "ignore") {
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
			return;
		}

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

			{/* 画布 + 右侧工具（仅编辑模式且持久化时显示工具按钮） */}
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
				{/* 编辑模式下才显示：选择 / 取消 / 新建空间（无 persistCallbacks 时始终显示） */}
				{(editMode || !persistCallbacks) && (
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
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-full justify-center"
							onClick={() => setToolMode((m) => (m === "cleanSegments" ? null : "cleanSegments"))}
						>
							清理线段
						</Button>
						{error && persistCallbacks && <span className="text-destructive text-xs">{error}</span>}
						{!noItems &&
							selectedSpaceId &&
							(() => {
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
				)}
			</div>
		</div>
	);
};

export { CanvasGridSelector };
