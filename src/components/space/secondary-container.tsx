"use client";

import { cn } from "@/lib/utils";
import { useDndContext, useDndMonitor, useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { SortableWrap } from "./sortabble-wrap";
import { ContainerAsset } from "./types";

type SecondaryContainerProps = {
	id: string;
	name: string;
	description: string | null;
	icon: React.ReactNode;
	assets: ContainerAsset[];
};

const SecondaryContainer = ({
	id,
	name,
	description,
	icon,
	assets,
}: SecondaryContainerProps) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [hoverExpandReady, setHoverExpandReady] = useState(false);
	const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const dndContext = useDndContext();
	const activeId = dndContext.active?.id;
	const activeType = dndContext.active?.data?.current?.type as string | undefined;

	useDndMonitor({
		onDragEnd(event) {
			if (event.active.id == id) return;
			if (event.active.data?.current?.type === "container") return;
			const overId = event.over?.id;
			if (overId === `container-drop-${id}`) {
				setIsExpanded(true);
			}
		},
	});

	const droppableId = `container-drop-${id}`;
	const { setNodeRef, isOver } = useDroppable({
		id: droppableId,
		data: {
			accepts: ["assets", "asset-in-container"],
			containerId: id,
		},
	});

	// 容器滑过容器不展开、不高亮
	const isOverNotSelf =
		isOver && activeId !== id && activeType !== "container";

	// 浮在容器上 2s 才展开
	useEffect(() => {
		if (isOverNotSelf) {
			hoverTimerRef.current = setTimeout(() => {
				setHoverExpandReady(true);
			}, 2000);
		} else {
			if (hoverTimerRef.current) {
				clearTimeout(hoverTimerRef.current);
				hoverTimerRef.current = null;
			}
			setHoverExpandReady(false);
		}
		return () => {
			if (hoverTimerRef.current) {
				clearTimeout(hoverTimerRef.current);
				hoverTimerRef.current = null;
			}
		};
	}, [isOverNotSelf]);

	const shouldExpand = (isOverNotSelf && hoverExpandReady) || isExpanded;

	return (
		<Card
			ref={setNodeRef}
			className={cn(
				"rounded-3xl transition-all duration-300 ease-out cursor-pointer",
				shouldExpand && "relative z-20",
				shouldExpand ? "w-[440px] h-[440px]" : "w-40 h-40",
				isOverNotSelf && "ring-2 ring-blue-400 ring-offset-2 shadow-lg"
			)}
			onClick={() => setIsExpanded((prev) => !prev)}
		>
			<CardContent
				className={cn(
					"flex flex-col h-full p-4 transition-all duration-300",
					shouldExpand ? "gap-3" : "items-center justify-center gap-2"
				)}
			>
				<div
					className={cn(
						"flex items-center transition-all duration-300",
						shouldExpand ? "gap-2" : "flex-col gap-1"
					)}
				>
					<div
						className={cn(
							"flex items-center justify-center drop-shadow-md transition-all duration-300",
							shouldExpand ? "h-8 w-8" : "h-12 w-12"
						)}
					>
						{icon}
					</div>
					<div className={cn(shouldExpand ? "flex-1 min-w-0" : "text-center")}>
						<div className="font-medium text-slate-700 truncate text-sm">
							{name}
						</div>
						{description && !shouldExpand && (
							<p className="text-xs text-slate-500 truncate">{description}</p>
						)}
					</div>
				</div>

				{shouldExpand && (
					<div className="flex-1 animate-in fade-in duration-200">
						{assets.length === 0 ? (
							<div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
								<span className="text-xs text-slate-400">松开放入此处</span>
							</div>
						) : (
							<SortableContext items={assets.map((a) => a.id)}>
								<div className="flex flex-wrap gap-2">
									{assets.map((asset) => (
										<SortableWrap key={asset.id} asset={asset} containerId={id} />
									))}
								</div>
							</SortableContext>
						)}
					</div>
				)}

				{!shouldExpand && assets.length > 0 && (
					<div className="text-xs text-slate-400">{assets.length} 个项目</div>
				)}
			</CardContent>
		</Card>
	);
};

export { SecondaryContainer };
