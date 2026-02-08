"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { FolderPlus } from "lucide-react";
import { CreateSpaceDialog } from "./create-space-dialog";

type SpacesPageClientProps = {
	children: React.ReactNode;
};

const menuItemClass =
	"flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:shrink-0 [&_svg]:size-4";

export function SpacesPageClient({ children }: SpacesPageClientProps) {
	const router = useRouter();
	const [contextMenu, setContextMenu] = useState<{
		open: boolean;
		x: number;
		y: number;
	}>({ open: false, x: 0, y: 0 });
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const closeMenu = useCallback(() => {
		setContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
	}, []);

	useEffect(() => {
		if (!contextMenu.open) return;
		const handleClickOutside = (e: MouseEvent) => {
			const el = menuRef.current;
			if (el && !el.contains(e.target as Node)) closeMenu();
		};
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeMenu();
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [contextMenu.open, closeMenu]);

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		// 点击在自带右键菜单的区域（搜索列表卡片、抽屉内等）时不弹出「新建空间」
		const target = e.target as HTMLElement;
		if (target.closest("[data-context-menu-handled]")) {
			return;
		}
		e.preventDefault();
		setContextMenu({ open: true, x: e.clientX, y: e.clientY });
	}, []);

	const handleCreateSpace = useCallback(() => {
		closeMenu();
		setCreateDialogOpen(true);
	}, [closeMenu]);

	const handleCreateSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<>
			<div
				className="flex flex-col gap-4 min-h-0 flex-1"
				onContextMenu={handleContextMenu}
			>
				{children}
			</div>

			{contextMenu.open && (
				<>
					<div
						className="fixed inset-0 z-40"
						aria-hidden
						onClick={closeMenu}
					/>
					<div
						ref={menuRef}
						className={cn(
							"bg-popover text-popover-foreground z-50 min-w-40 overflow-hidden rounded-md border p-1 shadow-md",
							"animate-in fade-in-0 zoom-in-95"
						)}
						style={{
							position: "fixed",
							left: contextMenu.x,
							top: contextMenu.y,
						}}
						role="menu"
					>
						<button
							type="button"
							className={menuItemClass}
							role="menuitem"
							onClick={handleCreateSpace}
						>
							<FolderPlus className="text-muted-foreground" />
							新建空间
						</button>
					</div>
				</>
			)}

			<CreateSpaceDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleCreateSuccess}
			/>
		</>
	);
}
