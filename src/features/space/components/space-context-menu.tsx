"use client";

import { useEffect, useRef } from "react";
import { Package, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpaceMenuContext = 
	| { type: "root" }
	| { type: "asset"; assetId: string };

type SpaceContextMenuProps = {
	open: boolean;
	x: number;
	y: number;
	context: SpaceMenuContext | null;
	onClose: () => void;
	onCreateAsset: () => void;
	onDeleteAsset?: (assetId: string) => void;
};

export function SpaceContextMenu({
	open,
	x,
	y,
	context,
	onClose,
	onCreateAsset,
	onDeleteAsset,
}: SpaceContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

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

	const handleNewAsset = () => {
		onCreateAsset();
		onClose();
	};

	const handleDeleteAsset = () => {
		if (context?.type === "asset" && onDeleteAsset) {
			onDeleteAsset(context.assetId);
			onClose();
		}
	};

	const itemClass =
		"flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:shrink-0 [&_svg]:size-4";
	
	const destructiveItemClass =
		"flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:shrink-0 [&_svg]:size-4";

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
						{context.type === "root" ? (
							<button
								type="button"
								className={itemClass}
								role="menuitem"
								onClick={handleNewAsset}
							>
								<Package className="text-muted-foreground" />
								新建物品
							</button>
						) : (
							<button
								type="button"
								className={destructiveItemClass}
								role="menuitem"
								onClick={handleDeleteAsset}
							>
								<Trash2 />
								删除物品
							</button>
						)}
					</div>
				</>
			)}
		</>
	);
}
