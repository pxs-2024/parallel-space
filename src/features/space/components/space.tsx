"use client";

import { MainContainer } from "@/components/space/main-container";
import { SortableRootAsset } from "@/components/space/sortable-root-asset";
import { SortableContainerWrap } from "@/components/space/sortable-container-wrap";
import { GridCell } from "@/components/space/grid-cell";
import {
	SpaceContextMenu,
	type SpaceMenuContext,
} from "@/features/space/components/space-context-menu";
import {
	Active,
	closestCenter,
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	useDroppable,
	useDndMonitor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState, useRef, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { AssetsOrContainerCard } from "@/components/assets/assets-or-container-card";
import {
	switchToSortMode,
	switchToGridMode,
	saveGridLayout,
	moveAssetToContainer,
	moveAssetBetweenContainers,
	updateContainerAssetsOrder,
	moveAssetFromContainerToRoot,
	updateRootItemsOrder,
} from "@/features/space/actions/layout-mode";
import type {
	RootSpaceItem,
	LayoutMode,
} from "@/features/space/queries/get-assets-or-container";

const ROWS = 6;
const COLS = 6;
const ROOT_DROP_ID = "root-drop";
const GRID_PREFIX = "grid-";
const CONTAINER_DROP_PREFIX = "container-drop-";

type LastOverRef = MutableRefObject<{
	id: string | number;
	data: Record<string, unknown> | null;
} | null>;

function LastOverTracker({ lastOverRef }: { lastOverRef: LastOverRef }) {
	useDndMonitor({
		onDragOver(ev) {
			lastOverRef.current = ev.over
				? { id: ev.over.id, data: ev.over.data?.current ?? null }
				: null;
		},
	});
	return null;
}

type SpaceContentProps = {
	items: RootSpaceItem[];
	layoutMode: LayoutMode;
	gridMatrix: (RootSpaceItem | null)[][];
	onModeToggle: () => void;
	onSave?: () => void;
	onContextMenu?: (context: SpaceMenuContext, e: React.MouseEvent) => void;
};

/** 在 DndContext 内使用 useDroppable，作为 MainContainer 的 children 渲染 */
function SpaceContent({
	items,
	layoutMode,
	gridMatrix,
	onModeToggle,
	onSave,
	onContextMenu,
}: SpaceContentProps) {
	const { setNodeRef } = useDroppable({
		id: ROOT_DROP_ID,
		data: { accepts: ["asset-in-container"], type: "root" },
	});

	const handleRootContextMenu = (e: React.MouseEvent) => {
		// 如果点击的是按钮、输入框等交互元素，不触发右键菜单
		const target = e.target as HTMLElement;
		if (
			target.tagName === "BUTTON" ||
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.closest("button") ||
			target.closest("input") ||
			target.closest("textarea")
		) {
			return;
		}
		// 如果点击的是已经有右键菜单处理的元素（物品、容器等），不在这里处理
		// 这些元素会自己处理右键菜单并阻止冒泡
		if (target.closest('[data-context-menu-handled]')) {
			return;
		}
		// 其他情况（空白区域）触发根级右键菜单
		e.preventDefault();
		e.stopPropagation();
		onContextMenu?.({ type: "root" }, e);
	};

	return (
		<div
			className="min-h-full p-4 flex flex-col gap-4"
			onContextMenu={handleRootContextMenu}
		>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onModeToggle}
					className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
				>
					{layoutMode === "sort" ? "切换为网格模式 (6×6)" : "切换为排序模式"}
				</button>
				{layoutMode === "grid" && onSave && (
					<button
						type="button"
						onClick={onSave}
						className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
					>
						保存布局
					</button>
				)}
				<span className="text-sm text-slate-500">
					{layoutMode === "sort"
						? "排序模式：拖拽自动排序"
						: "网格模式：拖到固定格子"}
				</span>
			</div>

			{layoutMode === "grid" ? (
				<div className="flex-1 relative">
					<div
						ref={setNodeRef}
						aria-hidden
						className="absolute w-0 h-0 overflow-hidden pointer-events-none"
					/>
					<div
						className="grid gap-2 w-fit"
						style={{
							gridTemplateColumns: `repeat(${COLS}, 10rem)`,
							gridTemplateRows: `repeat(${ROWS}, 10rem)`,
						}}
					>
						{gridMatrix.flatMap((row, r) =>
							row.map((item, c) => (
								<GridCell
									key={`${r}-${c}`}
									row={r}
									col={c}
									item={item}
									onContextMenu={onContextMenu}
								/>
							))
						)}
					</div>
				</div>
			) : (
				<div
					ref={setNodeRef}
					className="flex flex-wrap gap-2"
					onContextMenu={handleRootContextMenu}
				>
					<SortableContext items={items.map((x) => x.id)}>
						{items.map((it) =>
							it.type === "asset" ? (
								<SortableRootAsset
									key={it.id}
									asset={it}
									onContextMenu={onContextMenu}
								/>
							) : (
								<SortableContainerWrap
									key={it.id}
									container={{
										id: it.id,
										name: it.name,
										description: it.description,
										orderIndex: it.orderIndex,
										assets: it.assets,
									}}
									onContextMenu={onContextMenu}
								/>
							)
						)}
					</SortableContext>
				</div>
			)}
		</div>
	);
}

type SpaceProps = {
	spaceId: string;
	initialItems: RootSpaceItem[];
	initialLayoutMode: LayoutMode;
};

const Space = ({
	spaceId,
	initialItems,
	initialLayoutMode,
}: SpaceProps) => {
	const router = useRouter();
	const [items, setItems] = useState<RootSpaceItem[]>(initialItems);
	const layoutMode = initialLayoutMode;
	const [menu, setMenu] = useState<{
		open: boolean;
		x: number;
		y: number;
		context: SpaceMenuContext | null;
	}>({ open: false, x: 0, y: 0, context: null });

	const handleContextMenu = useCallback(
		(ctx: SpaceMenuContext, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setMenu({ open: true, x: e.clientX, y: e.clientY, context: ctx });
		},
		[]
	);

	const handleMenuClose = useCallback(() => {
		setMenu((m) => ({ ...m, open: false, context: null }));
	}, []);

	const handleMenuCreated = useCallback(() => {
		router.refresh();
	}, [router]);

	const containers = items.filter(
		(x): x is RootSpaceItem & { type: "container" } => x.type === "container"
	);

	const lastOverRef = useRef<{ id: string | number; data: Record<string, unknown> | null } | null>(null);
	const onDragEndRef = useRef<(e: DragEndEvent) => void>(() => {});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
	);
	const [activeItem, setActiveItem] = useState<Active | null>(null);
	const handleDragStart = useCallback((e: DragStartEvent) => {
		setActiveItem(e.active);
	}, []);
	const handleDragCancel = useCallback(() => {
		setActiveItem(null);
	}, []);

	const onDragEnd = useCallback(async (e: DragEndEvent) => {
		const { active, over } = e;
		// onDragEnd 有时 over 为 null，用 onDragOver 最后一次的 over 兜底
		const overResolved = over ?? (lastOverRef.current ? { id: lastOverRef.current.id, data: { current: lastOverRef.current.data } } : null);
		lastOverRef.current = null;

		const activeId = active?.id as string;
		const activeType = active?.data?.current?.type;
		const fromContainerId = active?.data?.current?.containerId as
			| string
			| undefined;

		const overId = overResolved?.id as string | undefined;
		const overType = overResolved?.data?.current?.type;
		const overContainerId = overResolved?.data?.current?.containerId as
			| string
			| undefined;

		const isDropOnContainer =
			overResolved &&
			typeof overResolved.id === "string" &&
			overResolved.id.toString().startsWith("container-drop-");
		const targetContainerId = isDropOnContainer
			? (overResolved?.data?.current?.containerId as string)
			: overType === "asset-in-container" && overContainerId
				? overContainerId
				: null;

		// 网格模式：松手在格子上（grid-r-c）、格内根物品上（根 item id）、或容器上（container-drop-X）
		// 仅更新本地 state，不调用 server action；保存时再批量提交
		// 注意：如果拖入容器（container-drop-X），且是根级 asset，应该走"从根拖入容器"逻辑，不在这里处理
		if (layoutMode === "grid" && overId != null) {
			const sid = String(overId);
			// 如果拖入容器，且是根级 asset，跳过网格逻辑，让后面的"从根拖入容器"逻辑处理
			if (sid.startsWith(CONTAINER_DROP_PREFIX) && activeType === "asset") {
				// 跳过，继续执行后面的逻辑
			} else {
				let row: number;
				let col: number;
				if (sid.startsWith(GRID_PREFIX)) {
					const parts = sid.slice(GRID_PREFIX.length).split("-");
					row = parseInt(parts[0], 10);
					col = parseInt(parts[1], 10);
				} else if (sid.startsWith(CONTAINER_DROP_PREFIX)) {
					const containerId = sid.slice(CONTAINER_DROP_PREFIX.length);
					const overItem = items.find((x) => x.id === containerId);
					if (overItem?.gridRow != null && overItem?.gridCol != null) {
						row = overItem.gridRow;
						col = overItem.gridCol;
					} else {
						row = NaN;
						col = NaN;
					}
				} else {
					const overItem = items.find((x) => x.id === sid);
					if (overItem && overItem.gridRow != null && overItem.gridCol != null) {
						row = overItem.gridRow;
						col = overItem.gridCol;
					} else {
						row = NaN;
						col = NaN;
					}
				}
				if (!Number.isNaN(row) && !Number.isNaN(col)) {
					// 从容器拖到网格：移到根级并设置 gridRow/gridCol
					if (activeType === "asset-in-container" && fromContainerId) {
					const from = containers.find((c) => c.id === fromContainerId);
					const a = from?.assets.find((x) => x.id === activeId);
					if (a) {
						setItems((prev) => {
							const occupant = prev.find(
								(it) => it.gridRow === row && it.gridCol === col
							);
							const without = prev.map((it) => {
								if (it.type !== "container" || it.id !== fromContainerId)
									return it;
								return {
									...it,
									assets: it.assets.filter((x) => x.id !== activeId),
								};
							});
							const newAsset: RootSpaceItem = {
								type: "asset",
								id: a.id,
								name: a.name,
								description: a.description,
								orderIndex: without.length,
								gridRow: row,
								gridCol: col,
							};
							if (occupant) {
								// 目标格有物品：将 occupant 移出网格（gridRow/gridCol 设为 null）
								return without
									.map((it) => {
										if (it.id === occupant.id) {
											return {
												...it,
												gridRow: null,
												gridCol: null,
											};
										}
										return it;
									})
									.concat([newAsset])
									.map((it, i) => ({ ...it, orderIndex: i }));
							}
							// 移动到空位
							return [...without, newAsset].map((it, i) => ({
								...it,
								orderIndex: i,
							}));
						});
					}
					return;
				}
				// 根级 item 移动到格子：交换或移动
				if (
					(activeType === "asset" || activeType === "container") &&
					items.some((x) => x.id === activeId)
				) {
					setItems((prev) => {
						const activeItem = prev.find((x) => x.id === activeId);
						if (!activeItem) return prev;
						const occupant = prev.find(
							(it) => it.gridRow === row && it.gridCol === col && it.id !== activeId
						);
						if (occupant) {
							// 交换位置
							return prev.map((it) => {
								if (it.id === activeId) {
									return { ...it, gridRow: row, gridCol: col };
								}
								if (it.id === occupant.id) {
									return {
										...it,
										gridRow: activeItem.gridRow,
										gridCol: activeItem.gridCol,
									};
								}
								return it;
							});
						} else {
							// 移动到空位
							return prev.map((it) =>
								it.id === activeId
									? { ...it, gridRow: row, gridCol: col }
									: it
							);
						}
					});
					return;
				}
				}
			}
		}

		// 1. 容器内排序
		if (
			activeType === "asset-in-container" &&
			fromContainerId &&
			overType === "asset-in-container" &&
			overContainerId === fromContainerId &&
			activeId !== overId
		) {
			const container = containers.find((c) => c.id === fromContainerId);
			if (container) {
				const oldIdx = container.assets.findIndex((a) => a.id === activeId);
				const newIdx = container.assets.findIndex((a) => a.id === overId);
				if (oldIdx !== -1 && newIdx !== -1) {
					// 更新本地 state
					setItems((prev) =>
						prev.map((it) => {
							if (it.type !== "container" || it.id !== fromContainerId)
								return it;
							const next = arrayMove(it.assets, oldIdx, newIdx);
							return {
								...it,
								assets: next.map((a, i) => ({ ...a, orderIndex: i })),
							};
						})
					);
					// 调用 server action 保存到数据库
					const reordered = arrayMove(container.assets, oldIdx, newIdx);
					await updateContainerAssetsOrder(
						spaceId,
						fromContainerId,
						reordered.map((a, i) => ({ id: a.id, orderIndex: i }))
					);
					router.refresh();
				}
			}
			return;
		}

		// 2. 从容器拖出到根（仅排序模式；网格模式须放到格子）
		if (
			layoutMode === "sort" &&
			activeType === "asset-in-container" &&
			fromContainerId &&
			!targetContainerId &&
			!(
				overType === "asset-in-container" &&
				overContainerId === fromContainerId
			)
		) {
			const from = containers.find((c) => c.id === fromContainerId);
			const a = from?.assets.find((x) => x.id === activeId);
			if (a && from) {
				// 更新本地 state
				setItems((prev) => {
					const without = prev.map((it) => {
						if (it.type !== "container" || it.id !== fromContainerId)
							return it;
						return {
							...it,
							assets: it.assets.filter((x) => x.id !== activeId),
						};
					});
					const newAsset: RootSpaceItem = {
						type: "asset",
						id: a.id,
						name: a.name,
						description: a.description,
						orderIndex: without.length,
						gridRow: null,
						gridCol: null,
					};
					return [...without, newAsset].map((x, i) => ({
						...x,
						orderIndex: i,
					}));
				});
				// 调用 server action 保存到数据库
				await moveAssetFromContainerToRoot(spaceId, activeId, fromContainerId);
				router.refresh();
			}
			return;
		}

		// 3. 从容器拖到另一容器（松手在 container-drop 或 容器内 asset 上）
		if (
			activeType === "asset-in-container" &&
			fromContainerId &&
			targetContainerId &&
			targetContainerId !== fromContainerId
		) {
			const from = containers.find((c) => c.id === fromContainerId);
			const a = from?.assets.find((x) => x.id === activeId);
			if (a) {
				// 更新本地 state
				setItems((prev) =>
					prev.map((it) => {
						if (it.type !== "container") return it;
						if (it.id === fromContainerId)
							return {
								...it,
								assets: it.assets.filter((x) => x.id !== activeId),
							};
						if (it.id === targetContainerId)
							return {
								...it,
								assets: [
									...it.assets,
									{ ...a, orderIndex: it.assets.length },
								].map((x, i) => ({ ...x, orderIndex: i })),
							};
						return it;
					})
				);
				// 调用 server action 保存到数据库
				await moveAssetBetweenContainers(
					spaceId,
					activeId,
					fromContainerId,
					targetContainerId
				);
				router.refresh();
			}
			return;
		}

		// 4. 从根拖入容器（松手在 container-drop 或 容器内 asset 上）
		if (activeType === "asset" && targetContainerId) {
			const idx = items.findIndex(
				(x) => x.type === "asset" && x.id === activeId
			);
			const a = idx >= 0 && items[idx].type === "asset" ? items[idx] : null;
			if (a) {
				// 更新本地 state
				setItems((prev) => {
					const without = prev.filter(
						(x) => !(x.type === "asset" && x.id === activeId)
					);
					return without.map((it, i) => {
						if (it.type !== "container" || it.id !== targetContainerId)
							return { ...it, orderIndex: i };
						const next = [
							...it.assets,
							{
								id: a.id,
								name: a.name,
								description: a.description,
								orderIndex: it.assets.length,
							},
						];
						return {
							...it,
							orderIndex: i,
							assets: next.map((x, j) => ({ ...x, orderIndex: j })),
						};
					});
				});
				// 网格模式：只更新本地 state，不调用 server action（保存时再批量提交）
				// 排序模式：立即调用 server action 保存到数据库
				if (layoutMode === "sort") {
					await moveAssetToContainer(spaceId, activeId, targetContainerId);
					router.refresh();
				}
			}
			return;
		}

		// 5. 根级统一排序（仅排序模式；asset/container 混排）
		if (layoutMode !== "sort") return;
		const isRootActive =
			activeType === "asset" || activeType === "container";
		if (isRootActive && activeId !== (targetContainerId ?? overId)) {
			const oldIdx = items.findIndex((x) => x.id === activeId);
			const overRootId = isDropOnContainer ? targetContainerId : overId;
			const newIdx =
				overRootId != null
					? items.findIndex((x) => x.id === overRootId)
					: -1;
			if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
				// 更新本地 state
				const next = arrayMove(items, oldIdx, newIdx);
				setItems(next.map((it, i) => ({ ...it, orderIndex: i })));
				// 调用 server action 保存到数据库
				await updateRootItemsOrder(
					spaceId,
					next.map((it, i) => ({ id: it.id, orderIndex: i }))
				);
				router.refresh();
			}
			return;
		}
	}, [items, layoutMode, containers, setItems, spaceId, router]);
	useEffect(() => {
		onDragEndRef.current = onDragEnd;
	}, [onDragEnd]);

	const handleDragEnd = useCallback((e: DragEndEvent) => {
		setActiveItem(null);
		onDragEndRef.current(e);
	}, []);

	const renderDragOverlay = (active: Active) => {
		const type = active.data?.current?.type;
		const asset = active.data?.current?.asset as
			| { name: string; description: string }
			| undefined;
		const container = active.data?.current?.container as
			| { name: string; description: string | null }
			| undefined;

		if (type === "asset-in-container" && asset) {
			return (
				<AssetsOrContainerCard
					icon={<></>}
					name={asset.name}
					desc={asset.description}
					dragging
					type="dummy"
				/>
			);
		}
		if (type === "asset" && asset) {
			return (
				<AssetsOrContainerCard
					icon={<></>}
					name={asset.name}
					desc={asset.description}
					dragging
					type="dummy"
				/>
			);
		}
		if (type === "container" && container) {
			return (
				<AssetsOrContainerCard
					icon={<></>}
					name={container.name}
					desc={container.description ?? ""}
					dragging
					type="dummy"
				/>
			);
		}
		return null;
	};

	const handleModeToggle = async () => {
		if (layoutMode === "sort") {
			await switchToGridMode(spaceId);
		} else {
			await switchToSortMode(spaceId);
		}
		router.refresh();
	};

	const handleSaveGridLayout = async () => {
		const updates = items
			.filter((it): it is RootSpaceItem & { gridRow: number; gridCol: number } =>
				it.gridRow != null && it.gridCol != null
			)
			.map((it) => ({
				id: it.id,
				gridRow: it.gridRow,
				gridCol: it.gridCol,
			}));
		await saveGridLayout(spaceId, updates);
		router.refresh();
	};

	// 网格 6x6：仅 (gridRow, gridCol) 均非 null 的根项入格，避免 ??0 导致堆到 (0,0)
	const gridMatrix = (() => {
		const m: (RootSpaceItem | null)[][] = Array.from({ length: ROWS }, () =>
			Array.from<RootSpaceItem | null>({ length: COLS }).fill(null)
		);
		for (const it of items) {
			if (it.gridRow == null || it.gridCol == null) continue;
			const r = it.gridRow;
			const c = it.gridCol;
			if (r >= 0 && r < ROWS && c >= 0 && c < COLS) m[r][c] = it;
		}
		return m;
	})();

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<MainContainer>
				<LastOverTracker lastOverRef={lastOverRef} />
				<SpaceContent
					items={items}
					layoutMode={layoutMode}
					gridMatrix={gridMatrix}
					onModeToggle={handleModeToggle}
					onSave={layoutMode === "grid" ? handleSaveGridLayout : undefined}
					onContextMenu={handleContextMenu}
				/>
				<SpaceContextMenu
					open={menu.open}
					x={menu.x}
					y={menu.y}
					context={menu.context}
					spaceId={spaceId}
					layoutMode={layoutMode}
					onClose={handleMenuClose}
					onCreated={handleMenuCreated}
				/>
				<DragOverlay
					dropAnimation={null}
					style={{ cursor: "grabbing" }}
				>
					{activeItem && renderDragOverlay
						? renderDragOverlay(activeItem)
						: null}
				</DragOverlay>
			</MainContainer>
		</DndContext>
	);
};

export { Space };
