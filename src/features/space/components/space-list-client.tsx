"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { spacePath } from "@/paths";
import { SpaceCard } from "./space-card";
import { EditSpaceDialog, type SpaceForEdit } from "./edit-space-dialog";

const menuItemClass =
	"flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:shrink-0 [&_svg]:size-4";

type SpaceItem = {
	id: string;
	name: string;
	description: string;
};

type SpaceListClientProps = {
	spaces: SpaceItem[];
};

export function SpaceListClient({ spaces }: SpaceListClientProps) {
	const router = useRouter();
	const [contextMenu, setContextMenu] = useState<{
		open: boolean;
		x: number;
		y: number;
		space: SpaceForEdit | null;
	}>({ open: false, x: 0, y: 0, space: null });
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingSpace, setEditingSpace] = useState<SpaceForEdit | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const closeMenu = useCallback(() => {
		setContextMenu((prev) => (prev.open ? { ...prev, open: false, space: null } : prev));
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

	const handleCardContextMenu = useCallback((e: React.MouseEvent, space: SpaceForEdit) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ open: true, x: e.clientX, y: e.clientY, space });
	}, []);

	const handleEditSpace = useCallback(() => {
		const space = contextMenu.space;
		closeMenu();
		if (space) {
			setEditingSpace(space);
			setEditDialogOpen(true);
		}
	}, [contextMenu.space, closeMenu]);

	const handleEditSuccess = useCallback(() => {
		router.refresh();
		setEditingSpace(null);
	}, [router]);

	return (
		<>
			<div className="flex flex-1 flex-wrap items-start content-start gap-4">
				{spaces.map((space) => (
					<div
						key={space.id}
						className="relative"
						onContextMenu={(e) => handleCardContextMenu(e, space)}
					>
						<Link href={spacePath(space.id)}>
							<SpaceCard name={space.name} description={space.description} />
						</Link>
					</div>
				))}
			</div>

			{contextMenu.open && contextMenu.space && (
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
							onClick={handleEditSpace}
						>
							<Pencil className="text-muted-foreground" />
							修改空间
						</button>
					</div>
				</>
			)}

			<EditSpaceDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSuccess={handleEditSuccess}
				space={editingSpace}
			/>
		</>
	);
}
