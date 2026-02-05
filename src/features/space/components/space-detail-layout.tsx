"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpaceListDrawer } from "./space-list-drawer";

type SpaceItem = {
	id: string;
	name: string;
	description: string;
};

type SpaceDetailLayoutProps = {
	spaces: SpaceItem[];
	currentSpaceId: string;
	children: React.ReactNode;
};

export function SpaceDetailLayout({
	spaces,
	currentSpaceId,
	children,
}: SpaceDetailLayoutProps) {
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<>
			{children}

			{/* 底部入口：点击打开空间列表抽屉 */}
			<button
				type="button"
				onClick={() => setDrawerOpen(true)}
				className={cn(
					"fixed bottom-4 left-1/2 z-30 -translate-x-1/2",
					"flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur",
					"text-sm font-medium text-foreground",
					"hover:bg-muted/80 active:bg-muted",
					"transition-opacity duration-200",
					drawerOpen && "pointer-events-none opacity-0"
				)}
				aria-label="打开空间列表"
			>
				<LayoutGrid className="size-4" />
				空间列表
			</button>

			<SpaceListDrawer
				spaces={spaces}
				currentSpaceId={currentSpaceId}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
			/>
		</>
	);
}
