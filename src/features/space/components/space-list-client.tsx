"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceCard } from "./space-card";
import { EditSpaceDialog, type SpaceForEdit } from "./edit-space-dialog";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	defaultDropAnimation,
} from "@dnd-kit/core";
import {
	SortableContext,
	rectSortingStrategy,
	useSortable,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderSpaces } from "../actions/reorder-spaces";
import { SpaceAssetsDrawer } from "./space-assets-drawer";
import {
	SpaceDrawerFromTop,
	HEIGHT_SHOW_SPACE_DRAWER_VH,
} from "./space-drawer-from-top";
import { GlobalAssetSearchPanel } from "./global-asset-search-panel";
import { Button } from "@/components/ui/button";
import type { AssetWithSpace } from "../queries/get-all-spaces-assets";

const menuItemClass =
	"flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:shrink-0 [&_svg]:size-4";

type SpaceItem = {
	id: string;
	name: string;
	description: string;
};

type SpaceListClientProps = {
	spaces: SpaceItem[];
	allAssets: AssetWithSpace[];
};

function SortableSpaceItem({
	space,
	onContextMenu,
	onSpaceClick,
	didDragRef,
}: {
	space: SpaceItem;
	onContextMenu: (e: React.MouseEvent, space: SpaceForEdit) => void;
	onSpaceClick: (spaceId: string) => void;
	didDragRef: React.MutableRefObject<boolean>;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: space.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

		return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"relative flex cursor-grab items-center justify-center rounded-xl active:cursor-grabbing",
				"min-w-52 min-h-52 p-3",
				isDragging && "cursor-grabbing invisible"
			)}
			onContextMenu={(e) => onContextMenu(e, space)}
			{...attributes}
			{...listeners}
		>
			{/* 拖拽中：整项 invisible 占位不绘制，避免原位置多出一块背景；由 DragOverlay 显示预览 */}
			<button
				type="button"
				onClick={() => {
					if (didDragRef.current) {
						didDragRef.current = false;
						return;
					}
					onSpaceClick(space.id);
				}}
				className="block w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<SpaceCard name={space.name} description={space.description} />
			</button>
		</div>
	);
}

export function SpaceListClient({
	spaces: initialSpaces,
	allAssets,
}: SpaceListClientProps) {
	const router = useRouter();
	const t = useTranslations("space");
	const tFilters = useTranslations("filters");
	const [spaces, setSpaces] = useState<SpaceItem[]>(initialSpaces);
	const [searchPanelOpen, setSearchPanelOpen] = useState(false);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [drawerSpaceId, setDrawerSpaceId] = useState<string | null>(null);
	const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
	const [assetsDrawerHeightVh, setAssetsDrawerHeightVh] = useState(0);
	const didDragRef = useRef(false);

	const showTopSpaceDrawer =
		drawerSpaceId != null && assetsDrawerHeightVh >= HEIGHT_SHOW_SPACE_DRAWER_VH;
	const activeSpace = activeId ? spaces.find((s) => s.id === activeId) : null;

	const handleSpaceClick = useCallback((spaceId: string) => {
		setDrawerSpaceId(spaceId);
		setFocusAssetId(null);
	}, []);

	const handleJumpToSpace = useCallback((spaceId: string, assetId: string) => {
		setDrawerSpaceId(spaceId);
		setFocusAssetId(assetId);
	}, []);

	const [contextMenu, setContextMenu] = useState<{
		open: boolean;
		x: number;
		y: number;
		space: SpaceForEdit | null;
	}>({ open: false, x: 0, y: 0, space: null });
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingSpace, setEditingSpace] = useState<SpaceForEdit | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// 服务端数据更新后同步到本地（如新建、编辑后 refresh）
	useEffect(() => {
		setSpaces(initialSpaces);
	}, [initialSpaces]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				delay: 400,
				tolerance: 5,
			},
		})
	);

	const handleDragStart = useCallback((event: { active: { id: string } }) => {
		didDragRef.current = true;
		setActiveId(event.active.id);
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);
			// 拖拽结束后延迟重置，避免松手时的 click 触达 Link 进入详情
			setTimeout(() => {
				didDragRef.current = false;
			}, 150);

			if (!over || active.id === over.id) return;

			const oldIndex = spaces.findIndex((s) => s.id === active.id);
			const newIndex = spaces.findIndex((s) => s.id === over.id);
			if (oldIndex === -1 || newIndex === -1) return;

			const nextSpaces = arrayMove(spaces, oldIndex, newIndex);
			setSpaces(nextSpaces);

			const result = await reorderSpaces(nextSpaces.map((s) => s.id));
			if (!result.ok) {
				setSpaces(spaces);
				router.refresh();
			}
		},
		[spaces, router]
	);

	const closeMenu = useCallback(() => {
		setContextMenu((prev) => (prev.open ? { ...prev, open: false, space: null } : prev));
	}, []);

	useEffect(() => {
		if (!contextMenu.open) return;
		const handleClickOutside = (e: MouseEvent) => {
			const el = menuRef.current;
			if (el && !el.contains(e.target as Node)) closeMenu();
		};
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeMenu();
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [contextMenu.open, closeMenu]);

	const handleCardContextMenu = useCallback((e: React.MouseEvent, space: SpaceForEdit) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ open: true, x: e.clientX, y: e.clientY, space });
	}, []);

	const handleEditSpace = useCallback(() => {
		const space = contextMenu.space;
		closeMenu();
		if (space) {
			setEditingSpace(space);
			setEditDialogOpen(true);
		}
	}, [contextMenu.space, closeMenu]);

	const handleEditSuccess = useCallback(() => {
		router.refresh();
		setEditingSpace(null);
	}, [router]);

	return (
		<>
			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<SortableContext items={spaces.map((s) => s.id)} strategy={rectSortingStrategy}>
					<div className="flex min-w-0 flex-1">
						<div className="flex min-w-0 flex-1 flex-wrap items-start content-start gap-2">
							{spaces.map((space) => (
								<SortableSpaceItem
									key={space.id}
									space={space}
									onContextMenu={handleCardContextMenu}
									onSpaceClick={handleSpaceClick}
									didDragRef={didDragRef}
								/>
							))}
						</div>
					</div>
					<div
						className={cn(
							"fixed right-6 top-24 z-30 max-h-[calc(100vh-6rem)] transition-all duration-200 ease-out",
							searchPanelOpen
								? "translate-x-0 opacity-100"
								: "pointer-events-none translate-x-4 opacity-0"
						)}
					>
						<GlobalAssetSearchPanel
							assets={allAssets}
							spaces={spaces}
							onJumpToSpace={handleJumpToSpace}
							onClose={() => setSearchPanelOpen(false)}
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className={cn(
							"fixed right-6 top-[28%] z-30 h-12 w-12 -translate-y-1/2 rounded-full shadow-md transition-all duration-200 ease-out",
							searchPanelOpen ? "pointer-events-none scale-90 opacity-0" : "scale-100 opacity-100"
						)}
						onClick={() => setSearchPanelOpen(true)}
						aria-label={tFilters("search")}
					>
						<Search className="size-5" />
					</Button>
				</SortableContext>
				{/* 用 DragOverlay 在 portal 中渲染拖拽预览，避免被父级 overflow 裁剪。不再包一层带 bg 的 div，避免“多一块背景” */}
				<DragOverlay dropAnimation={defaultDropAnimation}>
					{activeSpace ? (
						<div className="cursor-grabbing w-fit">
							<SpaceCard
								name={activeSpace.name}
								description={activeSpace.description}
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			<SpaceDrawerFromTop
				open={showTopSpaceDrawer}
				spaces={spaces}
				currentSpaceId={drawerSpaceId}
				onSelectSpace={(id) => {
					setDrawerSpaceId(id);
					setFocusAssetId(null);
				}}
			/>
			<SpaceAssetsDrawer
				spaceId={drawerSpaceId}
				open={drawerSpaceId != null}
				onOpenChange={(open) => {
					if (!open) {
						setDrawerSpaceId(null);
						setFocusAssetId(null);
					}
				}}
				onHeightChange={setAssetsDrawerHeightVh}
				focusAssetId={focusAssetId}
				otherSpaces={drawerSpaceId ? spaces.filter((s) => s.id !== drawerSpaceId).map((s) => ({ id: s.id, name: s.name })) : []}
			/>

			{contextMenu.open && contextMenu.space && (
				<>
					<div
						className="fixed inset-0 z-40"
						aria-hidden
						onClick={closeMenu}
					/>
					<div
						ref={menuRef}
						className={cn(
							"bg-popover text-popover-foreground z-50 min-w-40 overflow-hidden rounded-md border p-1 shadow-md",
							"animate-in fade-in-0 zoom-in-95"
						)}
						style={{
							position: "fixed",
							left: contextMenu.x,
							top: contextMenu.y,
						}}
						role="menu"
					>
						<button
							type="button"
							className={menuItemClass}
							role="menuitem"
							onClick={handleEditSpace}
						>
							<Pencil className="text-muted-foreground" />
							{t("editSpace")}
						</button>
					</div>
				</>
			)}

			<EditSpaceDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSuccess={handleEditSuccess}
				space={editingSpace}
			/>
		</>
	);
}
