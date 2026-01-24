"use client";
import { MainContainer } from "@/components/space/main-container";
import { DraggableWrap } from "@/components/space/draggable-wrap";
import { DragEndEvent, Active } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { Viewport } from "@/components/space/types";
import { AssetsOrContainerCard } from "@/components/assets/assets-or-container-card";
import { Prisma } from "@/generated/prisma/client";
import { SecondaryContainer } from "@/components/space/secondary-container";


type QueryAsset = Prisma.AssetGetPayload<{
	select: {
		id: true,
		name: true,
		description: true,
		x: true,
		y: true,
	}
}>;

type QueryContainer = Prisma.ContainerGetPayload<{
	select: {
		id: true,
		name: true,
		description: true,
		x: true,
		y: true,
		assets: {
			select: {
				id: true,
				name: true,
				description: true,
				orderIndex: true,
			}
		}
	}
}>;

type SpaceProps = {
	// 写一下查询的类型 用prisma的类型系统
	initialAssets: QueryAsset[];
	initialContainers: QueryContainer[];
};

const Space = ({initialAssets,initialContainers}: SpaceProps) => {
	const [viewport, setViewport] = useState<Viewport>({
		vx: 0,
		vy: 0,
		scale: 1,
	});
	const [assets, setAssets] = useState<QueryAsset[]>(initialAssets);
	const [containers, setContainers] = useState<QueryContainer[]>(initialContainers);


	const onDragEnd = (e: DragEndEvent) => {
		const { active, delta, over } = e;
		const activeId = active?.id as string;
		const activeType = active?.data?.current?.type;
		const fromContainerId = active?.data?.current?.containerId as string | undefined;

		// 检查 over 的信息
		const overId = over?.id as string | undefined;
		const overType = over?.data?.current?.type;
		const overContainerId = over?.data?.current?.containerId as string | undefined;
		
		// 检查是否放到了容器的 droppable 区域上
		const isDropOnContainer = over && typeof over.id === "string" && over.id.startsWith("container-drop-");
		const targetContainerId = isDropOnContainer ? (over.data?.current?.containerId as string) : null;

		// 1. 容器内排序（优先检查）
		if (activeType === "asset-in-container" && fromContainerId && over) {
			// 如果放到同一容器内的另一个元素上，执行排序
			if (overType === "asset-in-container" && overContainerId === fromContainerId && activeId !== overId) {
				setContainers((prev) =>
					prev.map((container) => {
						if (container.id === fromContainerId) {
							const oldIndex = container.assets.findIndex((a) => a.id === activeId);
							const newIndex = container.assets.findIndex((a) => a.id === overId);
							if (oldIndex !== -1 && newIndex !== -1) {
								const newAssets = arrayMove(container.assets, oldIndex, newIndex);
								// 更新 orderIndex
								return {
									...container,
									assets: newAssets.map((a, idx) => ({ ...a, orderIndex: idx })),
								};
							}
						}
						return container;
					})
				);
				return;
			}
		}

		// 2. 从容器内拖出到画布（over 不是容器也不是同容器内元素）
		if (activeType === "asset-in-container" && fromContainerId && !isDropOnContainer) {
			// 排除：over 是同一容器内的元素（已在上面处理）
			if (overType === "asset-in-container" && overContainerId === fromContainerId) {
				return; // 已处理或不需要处理
			}
			
			// 找到原容器
			const fromContainer = containers.find((c) => c.id === fromContainerId);
			const draggedAsset = fromContainer?.assets.find((a) => a.id === activeId);
			
			if (draggedAsset && fromContainer) {
				// 从原容器中移除
				setContainers((prev) =>
					prev.map((container) => {
						if (container.id === fromContainerId) {
							return {
								...container,
								assets: container.assets.filter((a) => a.id !== activeId),
							};
						}
						return container;
					})
				);
				
				// 添加到画布（位置基于容器位置 + 拖拽偏移）
				setAssets((prev) => [
					...prev,
					{
						id: draggedAsset.id,
						name: draggedAsset.name,
						description: draggedAsset.description,
						x: fromContainer.x + delta.x / viewport.scale,
						y: fromContainer.y + delta.y / viewport.scale,
					},
				]);
				return;
			}
		}

		// 3. 从容器内拖到另一个容器
		if (activeType === "asset-in-container" && fromContainerId && isDropOnContainer && targetContainerId && targetContainerId !== fromContainerId) {
			const fromContainer = containers.find((c) => c.id === fromContainerId);
			const draggedAsset = fromContainer?.assets.find((a) => a.id === activeId);
			
			if (draggedAsset) {
				setContainers((prev) =>
					prev.map((container) => {
						// 从原容器移除
						if (container.id === fromContainerId) {
							return {
								...container,
								assets: container.assets.filter((a) => a.id !== activeId),
							};
						}
						// 添加到目标容器
						if (container.id === targetContainerId) {
							return {
								...container,
								assets: [
									...container.assets,
									{ ...draggedAsset, orderIndex: container.assets.length },
								],
							};
						}
						return container;
					})
				);
				return;
			}
		}

		// 3. 从画布拖入容器
		if (activeType === "asset" && isDropOnContainer && targetContainerId) {
			const draggedAsset = assets.find((a) => a.id === activeId);
			if (draggedAsset) {
				// 从 assets 中移除
				setAssets((prev) => prev.filter((a) => a.id !== activeId));
				
				// 添加到对应 container 的 assets 中
				setContainers((prev) =>
					prev.map((container) => {
						if (container.id === targetContainerId) {
							const newOrderIndex = container.assets.length;
							return {
								...container,
								assets: [
									...container.assets,
									{
										id: draggedAsset.id,
										name: draggedAsset.name,
										description: draggedAsset.description,
										orderIndex: newOrderIndex,
									},
								],
							};
						}
						return container;
					})
				);
				return;
			}
		}

		// 4. 普通拖拽：更新位置
		setAssets((prev) => (prev.map((asset) => {
			if(asset.id === activeId) {
				return { ...asset, x: asset.x + delta.x / viewport.scale, y: asset.y + delta.y / viewport.scale };
			}
			return asset;
		})));
		setContainers((prev) => (prev.map((container) => {
			if(container.id === activeId) {
				return { ...container, x: container.x + delta.x / viewport.scale, y: container.y + delta.y / viewport.scale };
			}
			return container;
		})));
	};

	// 渲染拖拽覆盖层
	const renderDragOverlay = (active: Active) => {
		const type = active.data?.current?.type;
		
		// 容器内的元素
		if (type === "asset-in-container") {
			const asset = active.data?.current?.asset;
			if (asset) {
				return (
					<AssetsOrContainerCard
						icon={<></>}
						name={asset.name}
						desc={asset.description}
						dragging={true}
						type="dummy"
					/>
				);
			}
		}
		
		return null;
	};

	return (
		<MainContainer 
			onDragEnd={onDragEnd} 
			viewport={viewport} 
			onViewportChange={setViewport}
			renderDragOverlay={renderDragOverlay}
		>
			{assets.map((asset) => (
				<DraggableWrap
					key={asset.id}
					position={{ id: asset.id, x: asset.x ?? 0, y: asset.y ?? 0 }}
					viewportScale={viewport.scale}
				>
					<AssetsOrContainerCard
						icon={<></>}
						name={asset.name}
						desc={asset.description}
					/>
				</DraggableWrap>
			))}
			{
				containers.map((container) => (
					<DraggableWrap
						key={container.id}
						position={{ id: container.id, x: container.x ?? 0, y: container.y ?? 0 }}
						viewportScale={viewport.scale}
						type="container"
					>
						<SecondaryContainer
							id={container.id}
							name={container.name}
							description={container.description}
							icon={<></>}
							assets={container.assets}
							viewportScale={viewport.scale}
						/>
					</DraggableWrap>
				))
			}
		</MainContainer>
	)

}

export {Space}