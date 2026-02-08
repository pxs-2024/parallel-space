"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceCard } from "./space-card";
import { Button } from "@/components/ui/button";

const DRAWER_HEIGHT_MIN = 200;
const DRAWER_HEIGHT_MAX = 85; // vh
const DRAWER_HEIGHT_DEFAULT = 42; // vh

type SpaceItem = {
	id: string;
	name: string;
	description: string;
};

type SpaceListDrawerProps = {
	spaces: SpaceItem[];
	currentSpaceId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function SpaceListDrawer({
	spaces,
	currentSpaceId,
	open,
	onOpenChange,
}: SpaceListDrawerProps) {
	const t = useTranslations("drawer");
	const [heightVh, setHeightVh] = useState(DRAWER_HEIGHT_DEFAULT);
	const [isResizing, setIsResizing] = useState(false);
	const startYRef = useRef(0);
	const startHeightRef = useRef(0);

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		startYRef.current = e.clientY;
		startHeightRef.current = heightVh;
	}, [heightVh]);

	useEffect(() => {
		if (!isResizing) return;
		const onMove = (e: MouseEvent) => {
			const dy = startYRef.current - e.clientY; // 向上拖增加高度
			const vhPerPx = 100 / window.innerHeight;
			const deltaVh = dy * vhPerPx;
			let next = startHeightRef.current + deltaVh;
			next = Math.max(DRAWER_HEIGHT_MIN / window.innerHeight * 100, Math.min(DRAWER_HEIGHT_MAX, next));
			setHeightVh(next);
		};
		const onUp = () => setIsResizing(false);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isResizing]);

	return (
		<>
			{/* 遮罩：打开时可点击关闭 */}
			{open && (
				<div
					className="fixed inset-0 z-40 bg-black/20"
					aria-hidden
					onClick={() => onOpenChange(false)}
				/>
			)}
			{/* 抽屉本体：从底部滑出 */}
			<div
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-border bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
					"transition-transform duration-300 ease-out",
					open ? "translate-y-0" : "translate-y-full"
				)}
				style={{
					height: `min(${heightVh}vh, ${DRAWER_HEIGHT_MAX}vh)`,
					maxHeight: `${DRAWER_HEIGHT_MAX}vh`,
				}}
			>
				{/* 顶部：拖拽条 + 收起按钮 */}
				<div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
					<button
						type="button"
						onMouseDown={handleResizeStart}
						className={cn(
							"touch-none rounded-full py-2 transition-colors",
							"hover:bg-muted/80 active:bg-muted",
							isResizing && "bg-muted"
						)}
						aria-label={t("resizeHandle")}
					>
						<span className="block h-1.5 w-12 rounded-full bg-muted-foreground/30" />
					</button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onOpenChange(false)}
						className="gap-1"
					>
						<ChevronDown className="size-4" />
						{t("collapse")}
					</Button>
				</div>
				{/* 空间列表：可滚动 */}
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<div className="flex flex-wrap items-start justify-start gap-4">
						{spaces.map((space) => (
							<button
								key={space.id}
								type="button"
								onClick={() => onOpenChange(false)}
								className={cn(
									"block w-full rounded-lg text-left transition-opacity hover:opacity-90",
									space.id === currentSpaceId && "ring-2 ring-primary ring-offset-2 ring-offset-background"
								)}
							>
								<SpaceCard name={space.name} description={space.description} />
							</button>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
