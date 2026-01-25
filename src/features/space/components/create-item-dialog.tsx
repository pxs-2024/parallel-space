"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createContainer, createAsset } from "@/features/space/actions/create-space-item";
import type { SpaceMenuContext } from "./space-context-menu";

type CreateItemDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "container" | "asset";
	context: SpaceMenuContext | null;
	spaceId: string;
	layoutMode: "sort" | "grid";
	onCreated?: () => void;
};

const LABEL = {
	container: { title: "新建容器", namePlaceholder: "容器名称", descPlaceholder: "容器描述（可选）" },
	asset: { title: "新建物品", namePlaceholder: "物品名称", descPlaceholder: "物品描述（可选）" },
};

export function CreateItemDialog({
	open,
	onOpenChange,
	type,
	context,
	spaceId,
	layoutMode,
	onCreated,
}: CreateItemDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		if (open) {
			setName("");
			setDescription("");
		}
	}, [open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!context) return;
		setPending(true);
		try {
			if (type === "container") {
				let opts: {
					name?: string;
					description?: string;
					orderIndex?: number;
					gridRow?: number | null;
					gridCol?: number | null;
				} = { name: name.trim() || undefined, description: description.trim() || undefined };
				if (context.type === "grid" && layoutMode === "grid") {
					opts = { ...opts, gridRow: context.row, gridCol: context.col };
				}
				const res = await createContainer(spaceId, opts);
				if (res.ok) {
					onOpenChange(false);
					onCreated?.();
				}
			} else {
				let opts: {
					name?: string;
					description?: string;
					containerId?: string | null;
					orderIndex?: number;
					gridRow?: number | null;
					gridCol?: number | null;
				} = { name: name.trim() || undefined, description: description.trim() || undefined };
				if (context.type === "container") {
					opts = { ...opts, containerId: context.containerId };
				} else if (context.type === "grid" && layoutMode === "grid") {
					opts = { ...opts, gridRow: context.row, gridCol: context.col };
				}
				const res = await createAsset(spaceId, opts);
				if (res.ok) {
					onOpenChange(false);
					onCreated?.();
				}
			}
		} finally {
			setPending(false);
		}
	};

	const label = LABEL[type];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{label.title}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="space-y-2">
						<label htmlFor="create-name" className="text-sm font-medium">
							{label.namePlaceholder}
						</label>
						<Input
							id="create-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={label.namePlaceholder}
							autoFocus
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="create-desc" className="text-sm font-medium">
							{label.descPlaceholder}
						</label>
						<Input
							id="create-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder={label.descPlaceholder}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={pending}
						>
							取消
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "创建中…" : "确定"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
