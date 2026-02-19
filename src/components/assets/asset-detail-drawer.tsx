"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAssetNameDescription } from "@/features/space/actions/update-asset-name-description";
import { updateAssetDetail } from "@/features/space/actions/update-asset-detail";
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
		consumeIntervalDays: true;
		consumeAmountPerTime: true;
		dueAt: true;
		lastDoneAt: true;
		nextDueAt: true;
	};
}>;

type DetailPatch = Partial<Pick<AssetForDetail, "name" | "description" | "quantity" | "unit" | "reorderPoint" | "consumeIntervalDays" | "consumeAmountPerTime" | "dueAt" | "nextDueAt">>;

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

function toDateInputValue(d: Date | null | undefined): string {
	if (!d) return "";
	const date = new Date(d);
	return date.toISOString().slice(0, 10);
}

type AssetDetailDrawerProps = {
	asset: AssetForDetail | null;
	spaceId: string;
	onClose: () => void;
	onUpdated?: (patch: DetailPatch) => void;
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

type EditingDetailKey = "unit" | "reorderPoint" | "consumeIntervalDays" | "consumeAmountPerTime" | "due";

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
	const [editingDetail, setEditingDetail] = useState<EditingDetailKey | null>(null);
	const [editUnit, setEditUnit] = useState(asset.unit ?? "");
	const [editReorderPoint, setEditReorderPoint] = useState(String(asset.reorderPoint ?? ""));
	const [editConsumeIntervalDays, setEditConsumeIntervalDays] = useState(String(asset.consumeIntervalDays ?? ""));
	const [editConsumeAmountPerTime, setEditConsumeAmountPerTime] = useState(String(asset.consumeAmountPerTime ?? ""));
	const [editDueStr, setEditDueStr] = useState(toDateInputValue(asset.nextDueAt ?? asset.dueAt ?? null));

	useEffect(() => {
		setEditName(asset.name);
		setEditDesc(asset.description ?? "");
		setEditUnit(asset.unit ?? "");
		setEditReorderPoint(String(asset.reorderPoint ?? ""));
		setEditConsumeIntervalDays(String(asset.consumeIntervalDays ?? ""));
		setEditConsumeAmountPerTime(String(asset.consumeAmountPerTime ?? ""));
		setEditDueStr(toDateInputValue(asset.nextDueAt ?? asset.dueAt ?? null));
	}, [asset.id, asset.name, asset.description, asset.unit, asset.reorderPoint, asset.consumeIntervalDays, asset.consumeAmountPerTime, asset.dueAt, asset.nextDueAt]);

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

	const handleSaveDetail = async () => {
		if (!editingDetail) return;
		let data: Parameters<typeof updateAssetDetail>[2] = {};
		let patch: DetailPatch = {};
		if (editingDetail === "unit") {
			data.unit = editUnit.trim() || null;
			patch.unit = data.unit;
		} else if (editingDetail === "reorderPoint") {
			const v = editReorderPoint.trim() === "" ? null : parseInt(editReorderPoint, 10);
			if (v !== null && (Number.isNaN(v) || v < 0)) {
				toast.error("补货线请填写非负整数");
				return;
			}
			data.reorderPoint = v;
			patch.reorderPoint = v;
		} else if (editingDetail === "consumeIntervalDays") {
			const v = editConsumeIntervalDays.trim() === "" ? null : parseInt(editConsumeIntervalDays, 10);
			if (v !== null && (Number.isNaN(v) || v < 0)) {
				toast.error("消耗周期请填写非负整数");
				return;
			}
			data.consumeIntervalDays = v;
			patch.consumeIntervalDays = v;
		} else if (editingDetail === "consumeAmountPerTime") {
			const v = editConsumeAmountPerTime.trim() === "" ? null : parseInt(editConsumeAmountPerTime, 10);
			if (v !== null && (Number.isNaN(v) || v < 0)) {
				toast.error("每次消耗数量请填写非负整数");
				return;
			}
			data.consumeAmountPerTime = v;
			patch.consumeAmountPerTime = v;
		} else if (editingDetail === "due") {
			const d = editDueStr.trim() ? new Date(editDueStr + "T00:00:00") : null;
			data.dueAt = d;
			data.nextDueAt = d;
			patch.dueAt = d;
			patch.nextDueAt = d;
		}
		const res = await updateAssetDetail(spaceId, asset.id, data);
		if (res.status === "SUCCESS") {
			toast.success(res.message);
			onUpdated?.(patch);
			setEditingDetail(null);
		} else if (res.message) {
			toast.error(res.message);
		}
	};

	const cancelEditDetail = () => {
		setEditingDetail(null);
		setEditUnit(asset.unit ?? "");
		setEditReorderPoint(String(asset.reorderPoint ?? ""));
		setEditConsumeIntervalDays(String(asset.consumeIntervalDays ?? ""));
		setEditConsumeAmountPerTime(String(asset.consumeAmountPerTime ?? ""));
		setEditDueStr(toDateInputValue(asset.nextDueAt ?? asset.dueAt ?? null));
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
						{/* 数量（仅展示） */}
						{asset.kind === "CONSUMABLE" && asset.quantity != null && (
							<div>
								<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("quantity")}</dt>
								<dd className="text-foreground">{qtyText}</dd>
							</div>
						)}
						{/* 单位：仅消耗型展示并可编辑 */}
						{asset.kind === "CONSUMABLE" && (
							<div>
								<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("unit")}</dt>
								<dd>
									{editingDetail === "unit" ? (
										<div className="flex flex-col gap-1.5">
											<input
												type="text"
												value={editUnit}
												onChange={(e) => setEditUnit(e.target.value)}
												className="h-8 rounded-md border border-input bg-background px-2 text-sm"
												placeholder={t("unit")}
												autoFocus
											/>
											<div className="flex gap-1">
												<Button size="sm" className="h-7" onClick={handleSaveDetail}>{t("save")}</Button>
												<Button variant="outline" size="sm" className="h-7" onClick={cancelEditDetail}>{t("cancel")}</Button>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<span className="text-foreground">{asset.unit ?? "—"}</span>
											<Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingDetail("unit")} aria-label={t("edit")}>
												<Pencil className="size-3" />
											</Button>
										</div>
									)}
								</dd>
							</div>
						)}
						{/* 补货线：消耗型可编辑 */}
						{asset.kind === "CONSUMABLE" && (
							<div>
								<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("reorderLine")}</dt>
								<dd>
									{editingDetail === "reorderPoint" ? (
										<div className="flex flex-col gap-1.5">
											<input
												type="number"
												min={0}
												value={editReorderPoint}
												onChange={(e) => setEditReorderPoint(e.target.value)}
												className="h-8 rounded-md border border-input bg-background px-2 text-sm"
												placeholder={t("reorderLine")}
												autoFocus
											/>
											<div className="flex gap-1">
												<Button size="sm" className="h-7" onClick={handleSaveDetail}>{t("save")}</Button>
												<Button variant="outline" size="sm" className="h-7" onClick={cancelEditDetail}>{t("cancel")}</Button>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<span className="text-foreground">{asset.reorderPoint != null ? String(asset.reorderPoint) : "—"}</span>
											<Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingDetail("reorderPoint")} aria-label={t("edit")}>
												<Pencil className="size-3" />
											</Button>
										</div>
									)}
								</dd>
							</div>
						)}
						{/* 消耗周期、每次消耗：消耗型可编辑 */}
						{asset.kind === "CONSUMABLE" && (
							<>
								<div>
									<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("consumeIntervalDays")}</dt>
									<dd>
										{editingDetail === "consumeIntervalDays" ? (
											<div className="flex flex-col gap-1.5">
												<input
													type="number"
													min={0}
													value={editConsumeIntervalDays}
													onChange={(e) => setEditConsumeIntervalDays(e.target.value)}
													className="h-8 rounded-md border border-input bg-background px-2 text-sm"
													autoFocus
												/>
												<div className="flex gap-1">
													<Button size="sm" className="h-7" onClick={handleSaveDetail}>{t("save")}</Button>
													<Button variant="outline" size="sm" className="h-7" onClick={cancelEditDetail}>{t("cancel")}</Button>
												</div>
											</div>
										) : (
											<div className="flex items-center gap-1">
												<span className="text-foreground">{asset.consumeIntervalDays != null ? String(asset.consumeIntervalDays) : "—"}</span>
												<Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingDetail("consumeIntervalDays")} aria-label={t("edit")}>
													<Pencil className="size-3" />
												</Button>
											</div>
										)}
									</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("consumeAmountPerTime")}</dt>
									<dd>
										{editingDetail === "consumeAmountPerTime" ? (
											<div className="flex flex-col gap-1.5">
												<input
													type="number"
													min={0}
													value={editConsumeAmountPerTime}
													onChange={(e) => setEditConsumeAmountPerTime(e.target.value)}
													className="h-8 rounded-md border border-input bg-background px-2 text-sm"
													autoFocus
												/>
												<div className="flex gap-1">
													<Button size="sm" className="h-7" onClick={handleSaveDetail}>{t("save")}</Button>
													<Button variant="outline" size="sm" className="h-7" onClick={cancelEditDetail}>{t("cancel")}</Button>
												</div>
											</div>
										) : (
											<div className="flex items-center gap-1">
												<span className="text-foreground">{asset.consumeAmountPerTime != null ? String(asset.consumeAmountPerTime) : "—"}</span>
												<Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingDetail("consumeAmountPerTime")} aria-label={t("edit")}>
													<Pencil className="size-3" />
												</Button>
											</div>
										)}
									</dd>
								</div>
							</>
						)}
						{/* 到期：时间型可编辑 */}
						{asset.kind === "TEMPORAL" && (
							<div>
								<dt className="text-xs font-medium text-muted-foreground mb-0.5">{t("due")}</dt>
								<dd>
									{editingDetail === "due" ? (
										<div className="flex flex-col gap-1.5">
											<input
												type="date"
												value={editDueStr}
												onChange={(e) => setEditDueStr(e.target.value)}
												className="h-8 rounded-md border border-input bg-background px-2 text-sm"
												autoFocus
											/>
											<div className="flex gap-1">
												<Button size="sm" className="h-7" onClick={handleSaveDetail}>{t("save")}</Button>
												<Button variant="outline" size="sm" className="h-7" onClick={cancelEditDetail}>{t("cancel")}</Button>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-1">
											<span className="text-foreground">{formatDate(asset.nextDueAt ?? asset.dueAt ?? null)}</span>
											<Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingDetail("due")} aria-label={t("edit")}>
												<Pencil className="size-3" />
											</Button>
										</div>
									)}
								</dd>
							</div>
						)}
					</dl>
				</div>
			</div>
		</>
	);
}
