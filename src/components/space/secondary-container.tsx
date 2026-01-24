"use client";

import { cn } from "@/lib/utils";
import { useDndContext, useDndMonitor, useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { SortableWrap } from "./sortabble-wrap";
import { ContainerAsset } from "./types";
// 容器内部的资产项类型


type SecondaryContainerProps = {
	id: string;
	name: string;
	description: string | null;
	icon: React.ReactNode;
	assets: ContainerAsset[];
	viewportScale: number;
};

// 容器内可排序的 asset 组件（使用 useSortable 实现丝滑动画）


const SecondaryContainer = ({
	id,
	name,
	description,
	icon,
	assets,
	viewportScale,
}: SecondaryContainerProps) => {

	const [isExpanded, setIsExpanded] = useState(false);
	const dndContext = useDndContext();
  // active 就是当前活跃的拖拽元素（拖拽中为对象，未拖拽为 null）
  const activeId= dndContext.active?.id;

	useDndMonitor({
		onDragEnd(event) {
			if(event.active.id==id)return;
			// 如果元素被放入了当前容器，保持容器展开
			const overId = event.over?.id;
			if (overId === `container-drop-${id}`) {
				setIsExpanded(true);
			}
		},
	});

	// 让整个容器成为可放置区域
	// 注意：droppable id 需要与 draggable id 不同，所以加前缀
	const droppableId = `container-drop-${id}`;
	const { setNodeRef, isOver } = useDroppable({
		id: droppableId,
		data: {
			accepts: ["assets",'asset-in-container'],
			containerId: id,
		},
	});

	const isOverNotSelf = isOver && activeId !== id;

	// 检测是否有容器内的元素正在被拖拽（用于移除 overflow 限制）

	return (
		<Card
			ref={setNodeRef}
			className={cn(
				"rounded-3xl transition-all duration-300 ease-out cursor-pointer",

				// 展开状态（九宫格尺寸，能容纳 3x3 个标准元素）
				// 3*128px(元素) + 2*12px(gap) + 2*16px(padding) = 440px
				isOverNotSelf || isExpanded ? "w-[440px] h-[440px]" : "w-40 h-40",
				// 悬停高亮效果（拖拽时）
				isOverNotSelf && "ring-2 ring-blue-400 ring-offset-2 shadow-lg"
			)}
			onClick={()=>{
				setIsExpanded((prev)=>!prev);
			}}
		>
			<CardContent
				className={cn(
					"flex flex-col h-full p-4 transition-all duration-300",
					isExpanded ? "gap-3" : "items-center justify-center gap-2"
				)}
			>
				{/* 头部: 图标和名称 */}
				<div
					className={cn(
						"flex items-center transition-all duration-300",
						isExpanded ? "gap-2" : "flex-col gap-1"
					)}
				>
					{/* Icon */}
					<div
						className={cn(
							"flex items-center justify-center drop-shadow-md transition-all duration-300",
							isExpanded ? "h-8 w-8" : "h-12 w-12"
						)}
					>
						{icon}
					</div>

					{/* Name & Description */}
					<div className={cn(isExpanded ? "flex-1 min-w-0" : "text-center")}>
						<div
							className={cn(
								"font-medium text-slate-700 truncate",
								isExpanded ? "text-sm" : "text-sm"
							)}
						>
							{name}
						</div>
						{description && !isExpanded && (
							<p className="text-xs text-slate-500 truncate">{description}</p>
						)}
					</div>
				</div>

				{/* 展开时显示九宫格 */}
				{isExpanded && (
					<div className="flex-1 animate-in fade-in duration-200">
						{assets.length === 0 ? (
							<div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
								<span className="text-xs text-slate-400">松开放入此处</span>
							</div>
						) : (
							<SortableContext items={assets}>
									{/* 渲染已有的 assets（可排序） */}
									{assets.map((asset) => (
										<SortableWrap 
											key={asset.id} 
											asset={asset} 
											containerId={id}
										/>
									))}
							</SortableContext>
						)}
					</div>
				)}

				{/* 收起时显示资产数量 */}
				{!isExpanded && assets.length > 0 && (
					<div className="text-xs text-slate-400">
						{assets.length} 个项目
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export { SecondaryContainer };

