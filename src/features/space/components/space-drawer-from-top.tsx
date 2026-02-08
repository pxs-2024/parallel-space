"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SpaceCard } from "./space-card";

/** 底部物品抽屉高度超过此值（vh）时，从顶部滑出空间抽屉 */
export const HEIGHT_SHOW_SPACE_DRAWER_VH = 50;

/** 顶部空间抽屉占用的高度（px），用于限制底部抽屉最大高度避免重叠 */
export const TOP_DRAWER_HEIGHT_PX = 240;

type SpaceItem = { id: string; name: string; description?: string };

type SpaceDrawerFromTopProps = {
	open: boolean;
	spaces: SpaceItem[];
	currentSpaceId: string | null;
	onSelectSpace: (spaceId: string) => void;
};

export function SpaceDrawerFromTop({
	open,
	spaces,
	currentSpaceId,
	onSelectSpace,
}: SpaceDrawerFromTopProps) {
	const [mounted, setMounted] = useState(false);
	const t = useTranslations("drawer");
	const stripScrollRef = useRef<HTMLDivElement>(null);
	const stripDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
	const didDragRef = useRef(false);

	useEffect(() => setMounted(true), []);

	// 横向拖拽滚动
	useEffect(() => {
		if (!open) return;
		const el = stripScrollRef.current;
		if (!el) return;
		const onMove = (e: MouseEvent) => {
			const d = stripDragRef.current;
			if (!d) return;
			didDragRef.current = true;
			el.scrollLeft = d.startScrollLeft + (d.startX - e.clientX);
		};
		const onUp = () => {
			stripDragRef.current = null;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
		const onDown = (e: MouseEvent) => {
			if ((e.target as HTMLElement).closest("button")) return;
			stripDragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
			document.body.style.cursor = "grabbing";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		};
		el.addEventListener("mousedown", onDown);
		return () => {
			el.removeEventListener("mousedown", onDown);
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [open]);

	// 滚轮横向滚动
	useEffect(() => {
		if (!open) return;
		const el = stripScrollRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			if (e.deltaY === 0) return;
			e.preventDefault();
			el.scrollLeft += e.deltaY;
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [open]);

	const handleSpaceClick = useCallback(
		(clickedSpaceId: string) => {
			if (didDragRef.current) {
				didDragRef.current = false;
				return;
			}
			if (clickedSpaceId !== currentSpaceId) onSelectSpace(clickedSpaceId);
		},
		[currentSpaceId, onSelectSpace]
	);

	const drawerContent = (
		<div
			className={cn(
				"fixed left-0 right-0 top-0 z-[55] flex flex-col rounded-b-2xl border-b border-border bg-background/95 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm",
				"transition-transform duration-300 ease-out",
				open ? "translate-y-0" : "-translate-y-full"
			)}
			style={{ height: `${TOP_DRAWER_HEIGHT_PX}px` }}
		>
			{/* 拖拽条 */}
			<div className="flex shrink-0 items-center justify-center border-b border-border px-4 py-2">
				<span className="block h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
			</div>
			{/* 空间列表：横向，可拖拽/滚轮左右滚动；底部无留白与下抽屉贴齐 */}
			<div
				ref={stripScrollRef}
				role="region"
				aria-label={t("spaceListAria")}
				className="cursor-grab active:cursor-grabbing flex flex-1 min-h-0 items-center overflow-x-auto overflow-y-hidden pt-4 pb-0 scrollbar-hide"
				style={{ scrollBehavior: "auto" }}
			>
				<div className="flex w-max min-w-full items-center justify-center gap-4 px-4">
					{spaces.map((space) => (
						<button
							key={space.id}
							type="button"
							onClick={() => handleSpaceClick(space.id)}
							className={cn(
								"shrink-0 rounded-lg text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								space.id === currentSpaceId &&
									"ring-2 ring-primary ring-offset-2 ring-offset-background"
							)}
						>
							<SpaceCard name={space.name} description={space.description} />
						</button>
					))}
				</div>
			</div>
		</div>
	);

	if (!mounted || typeof document === "undefined") return null;
	return createPortal(drawerContent, document.body);
}
