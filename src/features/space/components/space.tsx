"use client";
import { MainContainer } from "@/components/space/main-container";
import { DraggableWrap } from "@/components/space/draggable-wrap";
import { DragEndEvent } from "@dnd-kit/core";
import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Viewport } from "@/components/space/types";
import { AssetCard } from "@/components/assets/assets-or-container-card";
import { Prisma } from "@/generated/prisma/client";
import { updateAssetPosition } from "@/features/space/actions/update-asset-position";
import { deleteAsset } from "@/features/space/actions/delete-asset";
import { SpaceContextMenu, type SpaceMenuContext } from "@/features/space/components/space-context-menu";
import { CreateAssetDialog } from "@/features/space/components/create-asset-drawer";
import { useEffect } from "react";

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
	const [, startTransition] = useTransition();
	const [viewport, setViewport] = useState<Viewport>({
		vx: 0,
		vy: 0,
		scale: 1,
	});
	const [assets, setAssets] = useState<QueryAsset[]>(initialAssets);

	useEffect(() => {
		setAssets(initialAssets);
	},[initialAssets])

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null);
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
		setCreatePosition(null); // 清除位置
		// 使用 startTransition 来刷新页面数据
		startTransition(() => {
			router.refresh();
		});
	};

	const handleDeleteAsset = async (assetId: string) => {
		const result = await deleteAsset(spaceId, assetId);
		if (result.status === "SUCCESS") {
			// 从本地 state 中移除
			setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
			// 刷新页面数据
			startTransition(() => {
				router.refresh();
			});
		}
	};

	const handleAssetContextMenu = useCallback(
		(assetId: string, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setMenu({ open: true, x: e.clientX, y: e.clientY, context: { type: "asset", assetId } });
		},
		[]
	);

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
			
			// 将点击位置转换为画布坐标（世界坐标）
			// 需要找到 MainContainer 元素来获取其边界
			const container = target.closest('[data-main-container]') as HTMLElement;
			if (container) {
				const rect = container.getBoundingClientRect();
				const mx = e.clientX - rect.left; // 鼠标在容器内的X坐标
				const my = e.clientY - rect.top; // 鼠标在容器内的Y坐标
				
				// 转换为世界坐标
				const worldX = (mx - viewport.vx) / viewport.scale;
				const worldY = (my - viewport.vy) / viewport.scale;
				
				setCreatePosition({ x: worldX, y: worldY });
			}
			
			// 其他情况（空白区域）触发根级右键菜单
			handleContextMenu({ type: "root" }, e);
		},
		[handleContextMenu, viewport]
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
						onContextMenu={(e) => handleAssetContextMenu(asset.id, e)}
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
				onDeleteAsset={handleDeleteAsset}
			/>
			<CreateAssetDialog
				spaceId={spaceId}
				open={drawerOpen}
				onOpenChange={(open) => {
					setDrawerOpen(open);
					if (!open) {
						setCreatePosition(null); // 关闭时清除位置
					}
				}}
				onSuccess={handleAssetCreated}
				initialPosition={createPosition}
			/>
		</>
	)

}

export {Space}
