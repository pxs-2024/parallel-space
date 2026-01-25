"use client";

import { useEffect, useRef, useState } from "react";
import { FolderPlus, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateItemDialog } from "./create-item-dialog";

export type SpaceMenuContext =
	| { type: "root" }
	| { type: "grid"; row: number; col: number }
	| { type: "container"; containerId: string };

type SpaceContextMenuProps = {
	open: boolean;
	x: number;
	y: number;
	context: SpaceMenuContext | null;
	spaceId: string;
	layoutMode: "sort" | "grid";
	onClose: () => void;
	onCreated?: () => void;
};

export function SpaceContextMenu({
	open,
	x,
	y,
	context,
	spaceId,
	layoutMode,
	onClose,
	onCreated,
}: SpaceContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogType, setDialogType] = useState<"container" | "asset">("container");
	const [dialogContext, setDialogContext] = useState<SpaceMenuContext | null>(null);

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (e: MouseEvent) => {
			const el = menuRef.current;
			if (el && !el.contains(e.target as Node)) onClose();
		};
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [open, onClose]);

	const handleNewContainer = () => {
		if (!context) return;
		setDialogContext(context);
		setDialogType("container");
		setDialogOpen(true);
		onClose();
	};

	const handleNewAsset = () => {
		if (!context) return;
		setDialogContext(context);
		setDialogType("asset");
		setDialogOpen(true);
		onClose();
	};

	const handleDialogOpenChange = (next: boolean) => {
		setDialogOpen(next);
		if (!next) setDialogContext(null);
	};

	const itemClass =
		"flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:shrink-0 [&_svg]:size-4";

	return (
		<>
			{open && context && (
				<>
					<div
						className="fixed inset-0 z-40"
						aria-hidden
						onClick={onClose}
					/>
					<div
						ref={menuRef}
						className={cn(
							"bg-popover text-popover-foreground z-50 min-w-40 overflow-hidden rounded-md border p-1 shadow-md",
							"animate-in fade-in-0 zoom-in-95"
						)}
						style={{ position: "fixed", left: x, top: y }}
						role="menu"
					>
						<button
							type="button"
							className={itemClass}
							role="menuitem"
							onClick={handleNewContainer}
						>
							<FolderPlus className="text-muted-foreground" />
							新建容器
						</button>
						<button
							type="button"
							className={itemClass}
							role="menuitem"
							onClick={handleNewAsset}
						>
							<Package className="text-muted-foreground" />
							新建物品
						</button>
					</div>
				</>
			)}
			<CreateItemDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				type={dialogType}
				context={dialogContext}
				spaceId={spaceId}
				layoutMode={layoutMode}
				onCreated={onCreated}
			/>
		</>
	);
}
