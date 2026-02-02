"use client";

import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import React, { useCallback, useEffect, useRef } from "react";
import { ClientOnly } from "./client-only";
import { Viewport } from "./types";
import { clamp } from "./utils/clamp";

type DragSpaceProps = {
	children: React.ReactNode;
	onDragEnd: (e: DragEndEvent) => void;
	viewport: Viewport;
	onViewportChange: (vp: Viewport) => void;
	onContextMenu?: (e: React.MouseEvent) => void;
	/** 按住空格时为 true，此时仅允许平移背景，与拖拽物体互斥 */
	spaceDown: boolean;
	className?: string;
};

const MainContainer = ({
	children,
	onDragEnd,
	viewport: vp,
	onViewportChange: setVp,
	onContextMenu,
	spaceDown,
	className,
}: DragSpaceProps) => {
	const containerRef = useRef<HTMLDivElement | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5, // 移动 5px 后才开始拖拽，允许点击事件正常触发
			},
		})
	);
	
	const panRef = useRef<{
		startClientX: number; // 开始平移时鼠标X坐标
		startClientY: number; // 开始平移时鼠标Y坐标
		startTx: number; // 开始平移时的tx值
		startTy: number; // 开始平移时的ty值
	} | null>(null);

	// 使用useRef存储最新的vp值，避免闭包陷阱
	const vpRef = useRef<Viewport>(vp);
	useEffect(() => {
		vpRef.current = vp;
	}, [vp]);

	/**
	 * 鼠标滚轮缩放事件处理
	 * @param e 鼠标滚轮事件对象
	 */
	const onWheel = useCallback(
		(e: React.WheelEvent) => {
			const el = containerRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			if (!rect) return;

			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			const zoomIntensity = 0.0015;
			const nextScale = clamp(vp.scale * Math.exp(-e.deltaY * zoomIntensity), 0.25, 4);

			const wx = (mx - vp.vx) / vp.scale;
			const wy = (my - vp.vy) / vp.scale;

			const nextVx = mx - wx * nextScale;
			const nextVy = my - wy * nextScale;

			setVp({ vx: nextVx, vy: nextVy, scale: nextScale });
		},
		[vp.scale, vp.vx, vp.vy, setVp]
	);
	/**
	 * 鼠标按下事件处理（开始平移）
	 * @param e 鼠标事件对象
	 */
	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			// 只有在按下空格键且是左键点击时才开始平移
			if (!spaceDown || e.button !== 0) return;
			e.preventDefault();

			// 记录平移开始时的状态
			panRef.current = {
				startClientX: e.clientX,
				startClientY: e.clientY,
				startTx: vp.vx,
				startTy: vp.vy,
			};
		},
		[spaceDown, vp.vx, vp.vy]
	);

	/**
	 * 鼠标移动事件处理（执行平移）
	 * @param e 鼠标事件对象
	 */
	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!panRef.current) return;

			const dx = e.clientX - panRef.current.startClientX;
			const dy = e.clientY - panRef.current.startClientY;
			const currentVp = vpRef.current;

			const nextVx = panRef.current.startTx + dx;
			const nextVy = panRef.current.startTy + dy;

			setVp({ ...currentVp, vx: nextVx, vy: nextVy });
		},
		[setVp]
	);

	/**
	 * 结束平移操作
	 */
	const endPan = useCallback(() => {
		panRef.current = null;
	}, []);

	/**
	 * 拖拽结束事件处理
	 * 将拖拽的位移从屏幕坐标转换为世界坐标并更新节点位置
	 * @param e 拖拽结束事件对象
	 */
	const handleDragEnd = useCallback(
		(e: DragEndEvent) => {
			onDragEnd(e);
		},
		[onDragEnd]
	);
		return (
		<div
			ref={containerRef}
			data-main-container
			onWheel={onWheel}
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={endPan}
			onMouseLeave={endPan}
			onContextMenu={onContextMenu}
			className={cn(
				"drag-space-grid h-full w-full rounded-xl border border-border/50 bg-background/30 relative overflow-hidden select-none",
				spaceDown ? "cursor-grab" : "cursor-default",
				className
			)}
			style={{
				backgroundSize: `${40 * vp.scale}px ${40 * vp.scale}px`,
				backgroundPosition: `${vp.vx}px ${vp.vy}px`,
			}}
		>
			<ClientOnly>
				<DndContext 
					sensors={sensors} 
					onDragEnd={handleDragEnd}
				>
					<div
						className="absolute left-0 top-0 origin-top-left w-0 h-0"
						style={{
							transform: `translate3d(${vp.vx}px, ${vp.vy}px, 0) scale(${vp.scale})`,
						}}
					>
						<div className="absolute left-0 top-0 w-2.5 h-2.5 rounded-[5px] bg-background translate-x-[-5px] translate-y-[-5px]" />
						{children}
					</div>
				</DndContext>
			</ClientOnly>
		</div>
	);
};

export { MainContainer };
