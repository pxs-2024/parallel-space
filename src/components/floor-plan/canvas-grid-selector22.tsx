"use client";

import { useEffect, useRef, useState } from "react";
import { Cell, Segment, cellsToBorderSegments, isConnected, unionCells } from "./utils";

const SIZE = 10;
const DRAG_THRESHOLD_PX = 3;
const MAX_CANVAS_SIZE = 4000; // 画布最大尺寸限制（4000个像素点）

type Shape = { id: string; cells: Cell[]; segs: Segment[] };

/**
		 * 将单元格坐标转换为唯一键值
		 * @param c 单元格对象，包含 x 和 y 坐标
		 * @returns 格式为 "x,y" 的字符串键
		 */
		function keyOf(cell: Cell) {
			return `${cell.x},${cell.y}`;
		}

		/**
		 * 验证单元格坐标是否在画布限制范围内
		 * @param cell 单元格对象
		 * @returns 是否在有效范围内
		 */
		function isValidCell(cell: Cell): boolean {
			return (
				cell.x >= 0 && 
				cell.y >= 0 && 
				cell.x < MAX_CANVAS_SIZE && 
				cell.y < MAX_CANVAS_SIZE
			);
		}

		/**
		 * 限制单元格坐标在画布范围内
		 * @param cell 单元格对象
		 * @returns 限制后的单元格坐标
		 */
		function clampCell(cell: Cell): Cell {
			return {
				x: clamp(cell.x, 0, MAX_CANVAS_SIZE - 1),
				y: clamp(cell.y, 0, MAX_CANVAS_SIZE - 1)
			};
		}

		/**
		 * 获取画布的实际像素尺寸
		 * @returns 画布的像素宽度和高度
		 */
		function getCanvasPixelSize() {
			return {
				width: MAX_CANVAS_SIZE, // 4000像素
				height: MAX_CANVAS_SIZE  // 4000像素
			};
		}

		/**
		 * 获取画布的格子数量
		 * @returns 画布的格子宽度和高度数量
		 */
		function getCanvasGridCount() {
			return {
				width: MAX_CANVAS_SIZE / SIZE, // 400个格子
				height: MAX_CANVAS_SIZE / SIZE  // 400个格子
			};
		}

/**
 * 将数值限制在指定范围内
 * @param n 要限制的数值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的数值
 */
function clamp(number: number, min: number, max: number) {
	return Math.max(min, Math.min(max, number));
}

type DragMode = "none" | "pan" | "moveShape" | "boxSelectCells";

/**
 * CanvasGridSelector - 网格画布选择器组件
 *
 * 功能特性：
 * - 网格绘制和选择
 * - 多种交互模式：平移、缩放、选择、移动图形
 * - 支持 Shift 键锁定选择模式
 * - 实时绘制和状态管理
 */
export default function CanvasGridSelector() {
	// Canvas 元素引用
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	// 包装容器引用
	const wrapRef = useRef<HTMLDivElement | null>(null);

	// 当前选中的单元格数组
	const [selected, setSelected] = useState<Cell[]>([]);
	// 所有已创建的形状数组
	const [shapes, setShapes] = useState<Shape[]>([]);
	// 错误状态消息
	const [error, setError] = useState("");

	// 当前选中的形状ID
	const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

	// 最新状态的引用（用于在事件处理中获取最新状态）
	const selectedRef = useRef<Cell[]>([]);
	const shapesRef = useRef<Shape[]>([]);
	selectedRef.current = selected;
	shapesRef.current = shapes;

	// 当前选中形状的引用
	const selectedShapeIdRef = useRef<string | null>(null);
	selectedShapeIdRef.current = selectedShapeId;

	// 鼠标悬停的形状ID引用
	const hoverShapeIdRef = useRef<string | null>(null);

	// 形状ID到单元格集合的映射（用于快速查找）
	const shapeCellSetRef = useRef<Map<string, Set<string>>>(new Map());

	// 视口变换参数（平移和缩放）
	const viewRef = useRef({ translateX: 0, translateY: 0, scale: 1 });
	// 视口尺寸
	const viewportRef = useRef({ width: 800, height: 600 });

	// 空格键按下状态
	const spaceRef = useRef(false);

	// 拖拽状态管理

	const dragStateRef = useRef<{
		mode: DragMode; // 当前拖拽模式
		startScreenX: number; // 开始拖拽时的屏幕X坐标
		startScreenY: number; // 开始拖拽时的屏幕Y坐标

		baseTranslateX: number; // 基准平移X值
		baseTranslateY: number; // 基准平移Y值

		startCell: Cell | null; // 开始拖拽时的单元格
		currentCell: Cell | null; // 当前鼠标位置对应的单元格

		shapeId: string | null; // 拖拽的形状ID
		baseShapeCells: Cell[] | null; // 拖拽开始时形状的原始单元格

		activated: boolean; // 是否已激活拖拽（超过阈值）

		// 本次 pointerdown 时是否按着 shift（锁定，避免中途按/松导致逻辑跳变）
		shiftAtStart: boolean;
	}>({
		mode: "none",
		startScreenX: 0,
		startScreenY: 0,
		baseTranslateX: 0,
		baseTranslateY: 0,
		startCell: null,
		currentCell: null,
		shapeId: null,
		baseShapeCells: null,
		activated: false,
		shiftAtStart: false,
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
		 * 构建矩形区域内的所有单元格
		 * @param a 第一个角点单元格
		 * @param b 对角单元格
		 * @returns 矩形区域内所有单元格的数组
		 */
		const buildCellsInRect = (cellA: Cell, cellB: Cell) => {
			const minX = Math.min(cellA.x, cellB.x);
			const maxX = Math.max(cellA.x, cellB.x);
			const minY = Math.min(cellA.y, cellB.y);
			const maxY = Math.max(cellA.y, cellB.y);
			const result: Cell[] = [];
			
			// 限制在画布范围内
			const clampedMinX = Math.max(0, minX);
			const clampedMaxX = Math.min(MAX_CANVAS_SIZE - 1, maxX);
			const clampedMinY = Math.max(0, minY);
			const clampedMaxY = Math.min(MAX_CANVAS_SIZE - 1, maxY);
			
			for (let y = clampedMinY; y <= clampedMaxY; y++) {
				for (let x = clampedMinX; x <= clampedMaxX; x++) result.push({ x, y });
			}
			return result;
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
		 * 通过单元格进行命中测试，返回最内层的形状ID
		 * 支持形状重叠时的精确选择（选择面积最小的）
		 * @param cell 要测试的单元格
		 * @returns 命中的形状ID或null
		 */
		const hitTestInnermostShapeIdByCell = (cell: Cell): string | null => {
			// 限制单元格在画布范围内
			const clampedCell = clampCell(cell);
			const shapes = shapesRef.current;
			if (!shapes.length) return null;
			const map = shapeCellSetRef.current;
			const cellKey = `${clampedCell.x},${clampedCell.y}`;

			let bestId: string | null = null;
			let bestArea = Infinity;

			// 从后往前遍历，优先选择上层的形状
			for (let i = shapes.length - 1; i >= 0; i--) {
				const shape = shapes[i];
				const set = map.get(shape.id);
				if (!set || !set.has(cellKey)) continue;
				const area = shape.cells.length;
				// 选择面积最小的形状（最精确的）
				if (area < bestArea) {
					bestArea = area;
					bestId = shape.id;
				}
			}
			return bestId;
		};

	/**
		 * 通过ID更新形状的单元格
		 * @param id 形状ID
		 * @param nextCells 新的单元格数组
		 */
		const updateShapeById = (id: string, nextCells: Cell[]) => {
			// 限制所有单元格在画布范围内
			const clampedCells = nextCells.map(clampCell);
			
			setShapes((prev) =>
				prev.map((shape) =>
					shape.id === id
						? { ...shape, cells: clampedCells, segs: cellsToBorderSegments(clampedCells) }
						: shape,
				),
			);
		};

	/**
		 * 确认创建新形状
		 * 验证选中的单元格是否连续且在画布范围内，然后创建新形状
		 */
		const confirm = () => {
			const currentSelection = selectedRef.current;
			
			// 验证选中的单元格是否都在有效范围内
			const invalidCells = currentSelection.filter(cell => !isValidCell(cell));
			if (invalidCells.length > 0) {
				setError("❌ 选中的方块超出画布范围");
				return;
			}
			
			if (!isConnected(currentSelection)) {
				setError("❌ 选中的方块不连续");
				return;
			}
			
			const segments = cellsToBorderSegments(currentSelection);
			const id = `${Date.now()}-${Math.random()}`;

			setShapes((prev) => [
				...prev,
				{ id, cells: currentSelection.map((cell) => ({ ...cell })), segs: segments },
			]);

			setSelected([]);
			setError("");
			setSelectedShapeId(id);
		};

	/**
	 * 清空当前选中的单元格
	 */
	const clearSelected = () => {
		setSelected([]);
		setError("");
	};

	/**
	 * 清空所有形状
	 */
	const clearShapes = () => {
		setShapes([]);
		setError("");
		hoverShapeIdRef.current = null;
		setSelectedShapeId(null);
		scheduleDraw();
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
				devicePixelRatio * translateY,
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
			ctx.roundRect(canvasMinX, canvasMinY, canvasMaxX - canvasMinX, canvasMaxY - canvasMinY, cornerRadius);
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
			const shapes = shapesRef.current;
			if (shapes.length) {
				ctx.lineWidth = 2 / scale;
				ctx.strokeStyle = "#2563eb";
				ctx.lineCap = "round";
				ctx.lineJoin = "round"; // 圆角连接（圆滑）

				for (const shape of shapes) {
					if (shape.segs.length === 0) continue;

					ctx.beginPath();
					// 第一个线段
					const first = shape.segs[0];
					ctx.moveTo(first.x1 * SIZE, first.y1 * SIZE);
					ctx.lineTo(first.x2 * SIZE, first.y2 * SIZE);

					// 后续线段（已排序，首尾相连）
					for (let i = 1; i < shape.segs.length; i++) {
						const seg = shape.segs[i];
						ctx.lineTo(seg.x2 * SIZE, seg.y2 * SIZE);
					}

					ctx.closePath(); // 闭合路径
					ctx.stroke();
				}
			}

			// 绘制悬停形状的高亮效果
				const hoverId = hoverShapeIdRef.current;
				if (hoverId) {
					const hoverShape = shapes.find((shape) => shape.id === hoverId);
					if (hoverShape && hoverShape.segs.length > 0) {
						// 填充半透明背景（只在画布范围内）
						ctx.fillStyle = "rgba(37,99,235,0.10)";
						for (const cell of hoverShape.cells) {
							if (isValidCell(cell)) {
								ctx.fillRect(cell.x * SIZE, cell.y * SIZE, SIZE, SIZE);
							}
						}

					// 绘制高亮轮廓（连续路径）
					ctx.lineWidth = 4 / scale;
					ctx.strokeStyle = "#1d4ed8";
					ctx.lineCap = "round";
					ctx.lineJoin = "round";

					ctx.beginPath();
					const first = hoverShape.segs[0];
					ctx.moveTo(first.x1 * SIZE, first.y1 * SIZE);
					ctx.lineTo(first.x2 * SIZE, first.y2 * SIZE);

					for (let i = 1; i < hoverShape.segs.length; i++) {
						const seg = hoverShape.segs[i];
						ctx.lineTo(seg.x2 * SIZE, seg.y2 * SIZE);
					}

					ctx.closePath();
					ctx.stroke();
				}
			}

			// 绘制选中形状的持久轮廓
				const selectedShapeIdValue = selectedShapeIdRef.current;
				if (selectedShapeIdValue) {
					const selectedShape = shapes.find((shape) => shape.id === selectedShapeIdValue);
					if (selectedShape && selectedShape.segs.length > 0) {
						ctx.lineWidth = 5 / scale;
						ctx.strokeStyle = "rgba(0,0,0,0.35)";
						ctx.lineCap = "round";
						ctx.lineJoin = "round";

						ctx.beginPath();
						const first = selectedShape.segs[0];
						ctx.moveTo(first.x1 * SIZE, first.y1 * SIZE);
						ctx.lineTo(first.x2 * SIZE, first.y2 * SIZE);

						for (let i = 1; i < selectedShape.segs.length; i++) {
							const seg = selectedShape.segs[i];
							ctx.lineTo(seg.x2 * SIZE, seg.y2 * SIZE);
						}

						ctx.closePath();
						ctx.stroke();
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
					if (left >= canvasMinX && left + rectWidth <= canvasMaxX && 
						top >= canvasMinY && top + rectHeight <= canvasMaxY) {
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
		// e.preventDefault();
		const screen = getScreenXYFromClient(e.clientX, e.clientY);
		if (!screen) return;

		const { screenX, screenY } = screen;

		// Ctrl/Cmd + 滚轮：缩放
		if (e.ctrlKey || e.metaKey) {
			const { translateX, translateY, scale } = viewRef.current;
			const worldX = (screenX - translateX) / scale;
			const worldY = (screenY - translateY) / scale;

			// 计算缩放因子
			const zoomFactor = Math.exp(-e.deltaY * 0.001);
			const nextScale = clamp(scale * zoomFactor, 0.25, 8);

			// 以鼠标位置为中心进行缩放
			const nextTranslateX = screenX - worldX * nextScale;
			const nextTranslateY = screenY - worldY * nextScale;
			
			viewRef.current = {
				translateX: nextTranslateX,
				translateY: nextTranslateY,
				scale: nextScale,
			};
			scheduleDraw();
			return;
		}

		// 普通滚轮：平移
		viewRef.current = {
			...viewRef.current,
			translateX: viewRef.current.translateX - e.deltaX,
			translateY: viewRef.current.translateY - e.deltaY,
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
				scale: reasonableScale 
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

	// 当形状数据变化时重建单元格集合映射
	useEffect(() => {
		const map = new Map<string, Set<string>>();
		for (const shape of shapes) {
			map.set(shape.id, new Set(shape.cells.map((cell) => `${cell.x},${cell.y}`)));
		}
		shapeCellSetRef.current = map;

		// 清理悬停状态（如果悬停的形状已被删除）
		if (hoverShapeIdRef.current) {
			const exists = shapes.some((shape) => shape.id === hoverShapeIdRef.current);
			if (!exists) hoverShapeIdRef.current = null;
		}
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shapes]);

	// 当选中状态变化时重绘
	useEffect(() => {
		scheduleDraw();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected, selectedShapeId]);

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
				shapeId: null,
				baseShapeCells: null,
				activated: true,
				shiftAtStart: false,
			};
			return;
		}

		const startCell = getCellFromScreen(screen.screenX, screen.screenY);
		const shift = e.shiftKey;

		// Shift键：强制进入框选单元格模式
		if (shift) {
			dragStateRef.current = {
				mode: "boxSelectCells",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell,
				currentCell: startCell,
				shapeId: null,
				baseShapeCells: null,
				activated: false,
				shiftAtStart: true,
			};
			return;
		}

		// 非Shift键：尝试命中测试形状
		const hitId = hitTestInnermostShapeIdByCell(startCell);
		if (hitId) {
			// 命中形状：进入移动形状模式
			const shape = shapesRef.current.find((existingShape) => existingShape.id === hitId);
			dragStateRef.current = {
				mode: "moveShape",
				startScreenX: screen.screenX,
				startScreenY: screen.screenY,
				baseTranslateX: viewRef.current.translateX,
				baseTranslateY: viewRef.current.translateY,
				startCell,
				currentCell: startCell,
				shapeId: hitId,
				baseShapeCells: shape ? shape.cells.map((cell) => ({ ...cell })) : null,
				activated: false,
				shiftAtStart: false,
			};
			hoverShapeIdRef.current = hitId;
			scheduleDraw();
			return;
		}

		// 未命中形状：进入框选单元格模式
		dragStateRef.current = {
			mode: "boxSelectCells",
			startScreenX: screen.screenX,
			startScreenY: screen.screenY,
			baseTranslateX: viewRef.current.translateX,
			baseTranslateY: viewRef.current.translateY,
			startCell,
			currentCell: startCell,
			shapeId: null,
			baseShapeCells: null,
			activated: false,
			shiftAtStart: false,
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
			const nextHoverId = cell ? hitTestInnermostShapeIdByCell(cell) : null;
			if (hoverShapeIdRef.current !== nextHoverId) {
				hoverShapeIdRef.current = nextHoverId;
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
			state.shapeId &&
			state.startCell &&
			state.baseShapeCells
		) {
			// 计算形状移动的偏移量
			const deltaCellX = currentCell.x - state.startCell.x;
			const deltaCellY = currentCell.y - state.startCell.y;
			const movedCells = state.baseShapeCells.map((cell) => ({
				x: cell.x + deltaCellX,
				y: cell.y + deltaCellY,
			}));
			updateShapeById(state.shapeId, movedCells);
			hoverShapeIdRef.current = state.shapeId;
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
			if (!state.activated && state.shapeId) {
				// 未激活：点击选中形状
				setSelectedShapeId(state.shapeId);
				hoverShapeIdRef.current = state.shapeId;
			} else if (state.shapeId) {
				// 已激活：拖拽完成，保持选中状态
				setSelectedShapeId(state.shapeId);
			}
		} else if (state.mode === "boxSelectCells") {
			// Shift优先：click/drag都是对cell操作
			if (state.shiftAtStart && state.startCell) {
				if (!state.activated) {
					// shift + click => 切换单元格选中状态
					setSelectedShapeId(null);
					toggleCell(state.startCell);
				} else if (state.activated && state.currentCell) {
					// shift + drag => 批量添加单元格
					const batch = buildCellsInRect(state.startCell, state.currentCell);
					setSelected((prev) => unionCells(prev, batch));
				}
			} else {
				// 非shift：只处理图形选中；空白不再toggle cell（必须Shift才能选cell）
				if (state.startCell) {
					if (!state.activated) {
						const hitId = hitTestInnermostShapeIdByCell(state.startCell);
						if (hitId) {
							// 点击形状：选中形状
							setSelectedShapeId(hitId);
							hoverShapeIdRef.current = hitId;
						} else {
							// 点击空白：仅取消图形选中
							setSelectedShapeId(null);
							hoverShapeIdRef.current = null;
						}
					} else {
						// 非shift拖动空白：不框选cell（保持Figma行为：空白拖动通常是框选对象）
						// 如果需要改成"空白拖动框选cell但不需要shift"，可以在这里修改
					}
				}
			}
		}

		// 重置拖拽状态
		dragStateRef.current = {
			mode: "none",
			startScreenX: 0,
			startScreenY: 0,
			baseTranslateX: 0,
			baseTranslateY: 0,
			startCell: null,
			currentCell: null,
			shapeId: null,
			baseShapeCells: null,
			activated: false,
			shiftAtStart: false,
		};

		scheduleDraw();
	};

	/**
	 * 指针离开事件处理
	 * 清除悬停状态
	 */
	const onPointerLeave = () => {
		if (dragStateRef.current.mode === "none" && hoverShapeIdRef.current !== null) {
			hoverShapeIdRef.current = null;
			scheduleDraw();
		}
	};

	return (
		<div className="p-6 space-y-4">
			{/* 控制按钮区域 */}
			<div className="flex flex-wrap items-center gap-3">
				<button
					onClick={confirm}
					disabled={!selected.length}
					className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-40"
				>
					圈出来
				</button>

				<button onClick={clearSelected} className="px-4 py-2 rounded border border-gray-300">
					清空选中
				</button>

				<button onClick={clearShapes} className="px-4 py-2 rounded border border-gray-300">
					清空图形
				</button>

				{/* 错误消息显示 */}
				{error && <span className="text-red-500">{error}</span>}
			</div>

			{/* 画布容器 */}
			<div
				ref={wrapRef}
				className="relative w-full h-[70vh] border border-gray-300 overflow-hidden"
			>
				<canvas
					ref={canvasRef}
					className="block touch-none"
					// onContextMenu={(e) => e.preventDefault()}
					onWheel={onWheel}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerLeave={onPointerLeave}
				/>
			</div>
		</div>
	);
}
