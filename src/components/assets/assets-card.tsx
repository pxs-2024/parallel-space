"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { Maximize2, GripVertical } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { AssetCardDragContent } from "./asset-card-drag-content";
import type { DragHandleProps } from "@/components/space/draggable-wrap";

const DEFAULT_SIZE = 160;
const MIN_SIZE = 80;
const MAX_SIZE = 400;

type AssetCardProps = {
	asset: Prisma.AssetGetPayload<{
		select: {
			id: true;
			name: true;
			description: true;
			kind: true;
			state: true;
			quantity: true;
			unit: true;
			reorderPoint: true;
			consumeIntervalDays: true;
			dueAt: true;
			lastDoneAt: true;
			nextDueAt: true;
			refUrl: true;
			expiresAt: true;
			createdAt: true;
			width: true;
			height: true;
		};
	}>;
	/** 是否显示右下角拖拽调整宽高把手 */
	canResize?: boolean;
	/** 拖拽结束回调，参数为新的宽高（px） */
	onResizeEnd?: (width: number, height: number) => void;
	/** 仅在此把手区域按下时可拖拽位置；不传则不可拖拽位置 */
	dragHandleProps?: DragHandleProps | null;
	/** 点击卡片（非把手区域）时回调，用于在右上角抽屉显示详情 */
	onCardClick?: (asset: AssetCardProps["asset"]) => void;
};

const AssetCard = ({ asset, canResize = false, onResizeEnd, dragHandleProps, onCardClick }: AssetCardProps) => {
	const [isGrabbing, setIsGrabbing] = useState(false);
	const [size, setSize] = useState({ width: asset.width ?? DEFAULT_SIZE, height: asset.height ?? DEFAULT_SIZE });
	const [isResizing, setIsResizing] = useState(false);
	const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
	const lastSizeRef = useRef({ width: asset.width ?? DEFAULT_SIZE, height: asset.height ?? DEFAULT_SIZE });
	const cardRef = useRef<HTMLDivElement | null>(null);
	const rafIdRef = useRef<number | null>(null);

	const displayW = isResizing ? size.width : (asset.width ?? DEFAULT_SIZE);
	const displayH = isResizing ? size.height : (asset.height ?? DEFAULT_SIZE);

	const handleMouseDown = () => {
		setIsGrabbing(true);
	};

	const handleMouseUp = () => {
		setIsGrabbing(false);
	};

	const handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (!canResize || !onResizeEnd) return;
			const w = asset.width ?? DEFAULT_SIZE;
			const h = asset.height ?? DEFAULT_SIZE;
			resizeRef.current = {
				startX: e.clientX,
				startY: e.clientY,
				startW: w,
				startH: h,
			};
			lastSizeRef.current = { width: w, height: h };
			setSize({ width: w, height: h });
			setIsResizing(true);
		},
		[canResize, onResizeEnd, asset.width, asset.height]
	);

	useEffect(() => {
		if (!isResizing) return;
		const onMove = (e: MouseEvent) => {
			const r = resizeRef.current;
			if (!r) return;
			const dx = e.clientX - r.startX;
			const dy = e.clientY - r.startY;
			const newW = Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.startW + dx)));
			const newH = Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, r.startH + dy)));
			lastSizeRef.current = { width: newW, height: newH };
			// 拖拽时直接改 DOM，避免大量 setState 导致卡顿；用 rAF 保证每帧只写一次
			if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = requestAnimationFrame(() => {
				rafIdRef.current = null;
				if (cardRef.current) {
					cardRef.current.style.width = `${lastSizeRef.current.width}px`;
					cardRef.current.style.height = `${lastSizeRef.current.height}px`;
				}
				// 不在此处 setState，避免拖拽过程中反复 re-render；松手时再同步
			});
		};
		const onUp = () => {
			if (rafIdRef.current != null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
			const { width, height } = lastSizeRef.current;
			setSize({ width, height });
			if (onResizeEnd) onResizeEnd(width, height);
			resizeRef.current = null;
			setIsResizing(false);
		};
		document.addEventListener("mousemove", onMove, { passive: true });
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [onResizeEnd, isResizing]);

	const canDragPosition = Boolean(dragHandleProps && Object.keys(dragHandleProps.listeners).length > 0 && !isResizing);
	const handleProps = canDragPosition ? dragHandleProps! : { listeners: {}, attributes: {} };

	const handleCardClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target instanceof Element && (
				e.target.closest("[data-drag-handle]") ||
				e.target.closest("[data-resize-handle]")
			)) return;
			onCardClick?.(asset);
		},
		[asset, onCardClick]
	);

	return (
		<Card
			ref={cardRef}
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			onClick={onCardClick ? handleCardClick : undefined}
			className={cn(
				"group relative rounded-3xl border border-border bg-transparent p-0 transition-all duration-200 ease-out overflow-visible",
				"shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.25)]",
				"hover:border-primary/20 hover:shadow-md dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
				isGrabbing &&
					"cursor-grabbing scale-[1.02] border-primary/30 shadow-lg dark:shadow-[0_12px_28px_rgba(0,0,0,0.4)] ring-2 ring-primary/20"
			)}
			style={{ width: displayW, height: displayH, minWidth: MIN_SIZE, minHeight: MIN_SIZE }}
		>
			{/* 仅在此区域按下时可拖拽位置；拖拽大小时不触发位移 */}
			{handleProps.listeners && Object.keys(handleProps.listeners).length > 0 && (
				<div
					data-drag-handle
					className={cn(
						"absolute left-0 right-0 top-0 z-10 flex cursor-grab items-center justify-center rounded-t-3xl border-b border-border/50 bg-muted/40 py-1.5 active:cursor-grabbing",
						"opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
					)}
					{...handleProps.listeners}
					{...handleProps.attributes}
				>
					<GripVertical className="size-4 text-muted-foreground" />
				</div>
			)}
			<CardContent className="flex h-full flex-col items-center justify-center p-0">
				<AssetCardDragContent
					nameOnly
					asset={{
						name: asset.name,
						description: asset.description,
						kind: asset.kind,
						consumeIntervalDays: asset.consumeIntervalDays,
						lastDoneAt: asset.lastDoneAt,
						nextDueAt: asset.nextDueAt,
						createdAt: asset.createdAt,
					}}
				/>
			</CardContent>
			{canResize && onResizeEnd && (
				<button
					type="button"
					data-resize-handle
					className="absolute bottom-0 right-0 z-10 flex cursor-se-resize items-center justify-center rounded-bl-lg rounded-tr-lg bg-primary/20 p-1 text-primary opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
					onMouseDown={handleResizeStart}
					aria-label="拖拽调整宽高"
				>
					<Maximize2 className="size-4" />
				</button>
			)}
		</Card>
	);
};

export { AssetCard };
