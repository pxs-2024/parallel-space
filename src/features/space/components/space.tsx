"use client";
import { MainContainer } from "@/components/space/main-container";
import { DraggableWrap } from "@/components/space/draggable-wrap";
import { DragEndEvent } from "@dnd-kit/core";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Viewport } from "@/components/space/types";
import { AssetCard } from "@/components/assets/assets-or-container-card";
import { Prisma } from "@/generated/prisma/client";
import { updateAssetPosition } from "@/features/space/actions/update-asset-position";
import { SpaceContextMenu, type SpaceMenuContext } from "@/features/space/components/space-context-menu";
import { CreateAssetDrawer } from "@/features/space/components/create-asset-drawer";

type QueryAsset = Prisma.AssetGetPayload<{
	select: {
		id: true,
		name: true,
		description: true,
		x: true,
		y: true,
	}
}>;

type SpaceProps = {
	spaceId: string;
	initialAssets: QueryAsset[];
};

const Space = ({spaceId, initialAssets}: SpaceProps) => {
	const router = useRouter();
	const [viewport, setViewport] = useState<Viewport>({
		vx: 0,
		vy: 0,
		scale: 1,
	});
	const [assets, setAssets] = useState<QueryAsset[]>(initialAssets);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [menu, setMenu] = useState<{
		open: boolean;
		x: number;
		y: number;
		context: SpaceMenuContext | null;
	}>({ open: false, x: 0, y: 0, context: null });

	const onDragEnd = async (e: DragEndEvent) => {
		const { active, delta } = e;
		const activeId = active?.id as string;

		// 普通拖拽：更新位置
		const activeAsset = assets.find((a) => a.id === activeId);
		if (activeAsset) {
			const newX = activeAsset.x + delta.x / viewport.scale;
			const newY = activeAsset.y + delta.y / viewport.scale;
			
			// 更新本地 state
			setAssets((prev) => (prev.map((asset) => {
				if(asset.id === activeId) {
					return { ...asset, x: newX, y: newY };
				}
				return asset;
			})));
			
			// 保存到数据库
			await updateAssetPosition(spaceId, activeId, newX, newY);
			router.refresh();
		}
	};

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

	const handleCreateAsset = () => {
		setDrawerOpen(true);
	};

	const handleAssetCreated = () => {
		router.refresh();
	};

	const handleRootContextMenu = useCallback(
		(e: React.MouseEvent) => {
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
			// 如果点击的是已经有右键菜单处理的元素（物品等），不在这里处理
			if (target.closest('[data-context-menu-handled]')) {
				return;
			}
			// 其他情况（空白区域）触发根级右键菜单
			handleContextMenu({ type: "root" }, e);
		},
		[handleContextMenu]
	);

	return (
		<>
			<MainContainer 
				onDragEnd={onDragEnd} 
				viewport={viewport} 
				onViewportChange={setViewport}
				onContextMenu={handleRootContextMenu}
			>
				{assets.map((asset) => (
					<DraggableWrap
						key={asset.id}
						position={{ id: asset.id, x: asset.x ?? 0, y: asset.y ?? 0 }}
						viewportScale={viewport.scale}
					>
						<AssetCard
							icon={<></>}
							name={asset.name}
							desc={asset.description}
						/>
					</DraggableWrap>
				))}
			</MainContainer>
			<SpaceContextMenu
				open={menu.open}
				x={menu.x}
				y={menu.y}
				context={menu.context}
				onClose={handleMenuClose}
				onCreateAsset={handleCreateAsset}
			/>
			<CreateAssetDrawer
				spaceId={spaceId}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				onSuccess={handleAssetCreated}
			/>
		</>
	)

}

export {Space}
