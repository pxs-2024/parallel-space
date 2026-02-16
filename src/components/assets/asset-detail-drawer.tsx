"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAssetNameDescription } from "@/features/space/actions/update-asset-name-description";
import type { Prisma } from "@/generated/prisma/client";

type AssetForDetail = Prisma.AssetGetPayload<{
	select: {
		id: true;
		name: true;
		description: true;
		kind: true;
		state: true;
		quantity: true;
		unit: true;
		reorderPoint: true;
		dueAt: true;
		lastDoneAt: true;
		nextDueAt: true;
	};
}>;

function fmt<T>(v: T | null | undefined, f?: (x: T) => string): string {
	if (v == null) return "—";
	return f ? f(v as T) : String(v);
}

function formatDate(d: Date | null): string {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

type AssetDetailDrawerProps = {
	asset: AssetForDetail | null;
	spaceId: string;
	onClose: () => void;
	onUpdated?: (patch: { name?: string; description?: string | null }) => void;
};

export function AssetDetailDrawer({ asset, spaceId, onClose, onUpdated }: AssetDetailDrawerProps) {
	if (!asset) return null;
	return (
		<AssetDetailDrawerContent
			asset={asset}
			spaceId={spaceId}
			onClose={onClose}
			onUpdated={onUpdated}
		/>
	);
}

function AssetDetailDrawerContent({
	asset,
	spaceId,
	onClose,
	onUpdated,
}: AssetDetailDrawerProps & { asset: AssetForDetail }) {
	const t = useTranslations("asset");
	const [editingName, setEditingName] = useState(false);
	const [editName, setEditName] = useState(asset.name);
	const [editingDesc, setEditingDesc] = useState(false);
	const [editDesc, setEditDesc] = useState(asset.description ?? "");

	const handleSaveName = async () => {
		const name = editName.trim();
		if (!name) return;
		const res = await updateAssetNameDescription(spaceId, asset.id, { name });
		if (res.status === "SUCCESS") {
			toast.success(res.message);
			onUpdated?.({ name });
			setEditingName(false);
		} else if (res.message) {
			toast.error(res.message);
		}
	};
	const handleSaveDesc = async () => {
		const res = await updateAssetNameDescription(spaceId, asset.id, {
			description: editDesc.trim() || null,
		});
		if (res.status === "SUCCESS") {
			toast.success(res.message);
			onUpdated?.({ description: editDesc.trim() || null });
			setEditingDesc(false);
		} else if (res.message) {
			toast.error(res.message);
		}
	};

	const qtyText = [fmt(asset.quantity), fmt(asset.unit)].filter(Boolean).join(" ") || "—";

	return (
		<>
			<div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />
			<div className="fixed right-4 bottom-4 z-50 w-80 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl">
				<div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
					<span className="text-sm font-medium text-muted-foreground">{t("itemInfo")}</span>
					<Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close")}>
						<X className="size-4" />
					</Button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<dl className="space-y-3 text-sm">
						{/* 名称 */}
						<div>
							<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("namePlaceholder")}</dt>
							<dd>
								{editingName ? (
									<div className="flex flex-col gap-1.5">
										<input
											type="text"
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											className="h-8 rounded-md border border-input bg-background px-2 text-sm"
											placeholder={t("namePlaceholder")}
											autoFocus
										/>
										<div className="flex gap-1">
											<Button size="sm" className="h-7" onClick={handleSaveName}>{t("save")}</Button>
											<Button variant="outline" size="sm" className="h-7" onClick={() => { setEditName(asset.name); setEditingName(false); }}>{t("cancel")}</Button>
										</div>
									</div>
								) : (
									<div className="flex items-center gap-1">
										<span className="text-foreground font-medium">{asset.name}</span>
										<Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => { setEditName(asset.name); setEditingName(true); }} aria-label={t("edit")}>
											<Pencil className="size-3" />
										</Button>
									</div>
								)}
							</dd>
						</div>
						{/* 描述 */}
						<div>
							<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("description")}</dt>
							<dd>
								{editingDesc ? (
									<div className="flex flex-col gap-1.5">
										<textarea
											value={editDesc}
											onChange={(e) => setEditDesc(e.target.value)}
											className="min-h-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-y"
											placeholder={t("descPlaceholder")}
											autoFocus
										/>
										<div className="flex gap-1">
											<Button size="sm" className="h-7" onClick={handleSaveDesc}>{t("save")}</Button>
											<Button variant="outline" size="sm" className="h-7" onClick={() => { setEditDesc(asset.description ?? ""); setEditingDesc(false); }}>{t("cancel")}</Button>
										</div>
									</div>
								) : (
									<div className="flex items-start justify-between gap-1">
										<p className="text-foreground whitespace-pre-wrap flex-1 min-w-0">
											{asset.description?.trim() || "—"}
										</p>
										<Button variant="ghost" size="sm" className="h-6 shrink-0 text-muted-foreground" onClick={() => { setEditDesc(asset.description ?? ""); setEditingDesc(true); }}>
											<Pencil className="size-3" />
										</Button>
									</div>
								)}
							</dd>
						</div>
						{/* 数量 / 补货线 */}
						{(asset.quantity != null || asset.reorderPoint != null || asset.unit) && (
							<div>
								<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("quantity")}</dt>
								<dd className="text-foreground">
									{qtyText}
									{asset.reorderPoint != null && (
										<span className="text-muted-foreground ml-1">· {t("reorderLine")} {asset.reorderPoint}</span>
									)}
								</dd>
							</div>
						)}
						{/* 到期 */}
						{(asset.nextDueAt ?? asset.dueAt) && (
							<div>
								<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("due")}</dt>
								<dd className="text-foreground">{formatDate(asset.nextDueAt ?? asset.dueAt ?? null)}</dd>
							</div>
						)}
					</dl>
				</div>
			</div>
		</>
	);
}
