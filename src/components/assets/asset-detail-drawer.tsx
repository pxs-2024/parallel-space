"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Box, Package, Clock, Link2, ExternalLink, X, Palette, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KindBadge } from "./kind-badge";
import { Badge } from "./badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { getAvatarGradient } from "@/features/space/utils/avatar-gradient";
import { updateAssetCardStyle } from "@/features/space/actions/update-asset-card-style";
import { updateAssetNameDescription } from "@/features/space/actions/update-asset-name-description";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_CARD_COLOR = "#8b5ca8";

function hexToRgba(hex: string, alpha: number): string {
	const h = hex.replace(/^#/, "");
	const m = h.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
	if (!m) return `rgba(0,0,0,${alpha})`;
	return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

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
		refUrl: true;
		expiresAt: true;
		cardColor: true;
		cardOpacity: true;
	};
}>;

function fmt<T>(v: T | null | undefined, f?: (x: T) => string): string {
	if (v == null) return "—";
	return f ? f(v as T) : String(v);
}

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	CONSUMABLE: Package,
	TEMPORAL: Clock,
	VIRTUAL: Link2,
};
function KindIcon({ kind, className }: { kind: string; className?: string }) {
	const Icon = KIND_ICONS[kind] ?? Box;
	return <Icon className={className} />;
}

const STATE_I18N_KEYS: Record<string, string> = {
	ACTIVE: "stateActive",
	PENDING_RESTOCK: "statePendingRestock",
	PENDING_DISCARD: "statePendingDiscard",
	ARCHIVED: "stateArchived",
	DISCARDED: "stateDiscarded",
};
function getStateLabel(state: string, t: (key: string) => string): string {
	const key = STATE_I18N_KEYS[state];
	return key ? t(key) : state;
}

function getStateBadgeVariant(state: string): "muted" | "blue" | "amber" | "red" {
	switch (state) {
		case "ACTIVE": return "blue";
		case "PENDING_RESTOCK":
		case "PENDING_DISCARD": return "amber";
		case "DISCARDED": return "red";
		default: return "muted";
	}
}

function formatDate(d: Date | null): string {
	if (!d) return "—";
	const x = new Date(d);
	return x.toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

type AssetDetailDrawerProps = {
	asset: AssetForDetail | null;
	spaceId: string;
	onClose: () => void;
	/** 保存后回调，用于同步本地状态 */
	onUpdated?: (patch: {
		cardColor?: string | null;
		cardOpacity?: number | null;
		name?: string;
		description?: string | null;
	}) => void;
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
	const [editingColor, setEditingColor] = useState(false);
	const [editColor, setEditColor] = useState(DEFAULT_CARD_COLOR);
	const [editOpacity, setEditOpacity] = useState(20);
	const [editingName, setEditingName] = useState(false);
	const [editName, setEditName] = useState(asset.name);
	const [editingDesc, setEditingDesc] = useState(false);
	const [editDesc, setEditDesc] = useState(asset.description ?? "");

	const openColorEditor = () => {
		setEditColor(asset.cardColor ?? DEFAULT_CARD_COLOR);
		setEditOpacity(
			asset.cardOpacity != null ? Math.round(Number(asset.cardOpacity) * 100) : 20
		);
		setEditingColor(true);
	};

	const qtyText = [fmt(asset.quantity), fmt(asset.unit)].filter(Boolean).join(" ") || "—";

	// 有卡片背景色时头像使用同色渐变，否则用名称生成的渐变
	const avatarBackground =
		asset.cardColor != null && asset.cardColor !== ""
			? `linear-gradient(135deg, ${hexToRgba(asset.cardColor, 0)} 0%, ${hexToRgba(asset.cardColor, asset.cardOpacity != null ? Math.max(0, Math.min(1, Number(asset.cardOpacity))) : 0.25)} 100%)`
			: getAvatarGradient(asset.name);

	const handleSaveColor = async () => {
		const color = editColor.trim() || null;
		const opacity = color != null ? editOpacity / 100 : null;
		await updateAssetCardStyle(spaceId, asset.id, {
			cardColor: color,
			cardOpacity: opacity,
		});
		toast.success("已保存");
		onUpdated?.({ cardColor: color, cardOpacity: opacity });
		setEditingColor(false);
	};

	const handleUseDefaultColor = async () => {
		await updateAssetCardStyle(spaceId, asset.id, {
			cardColor: null,
			cardOpacity: null,
		});
		toast.success("已保存");
		onUpdated?.({ cardColor: null, cardOpacity: null });
		setEditingColor(false);
	};

	const handleCancelColor = () => {
		setEditColor(asset.cardColor ?? DEFAULT_CARD_COLOR);
		setEditOpacity(
			asset.cardOpacity != null ? Math.round(Number(asset.cardOpacity) * 100) : 20
		);
		setEditingColor(false);
	};

	const openNameEditor = () => {
		setEditName(asset.name);
		setEditingName(true);
	};
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
	const handleCancelName = () => {
		setEditName(asset.name);
		setEditingName(false);
	};

	const openDescEditor = () => {
		setEditDesc(asset.description ?? "");
		setEditingDesc(true);
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
	const handleCancelDesc = () => {
		setEditDesc(asset.description ?? "");
		setEditingDesc(false);
	};

	// 实时预览：当前编辑中的渐变背景（与卡片一致）
	const previewBackground =
		editingColor && (editColor?.trim() || DEFAULT_CARD_COLOR)
			? `linear-gradient(135deg, ${hexToRgba(editColor.trim() || DEFAULT_CARD_COLOR, 0)} 0%, ${hexToRgba(editColor.trim() || DEFAULT_CARD_COLOR, editOpacity / 100)} 100%)`
			: undefined;

	return (
		<>
			<div
				className="fixed inset-0 z-40"
				aria-hidden
				onClick={onClose}
			/>
			{/* 调色盘：紧挨物品信息面板左侧，底边对齐，不遮挡信息卡 */}
			{editingColor && (
				<div
					className="fixed bottom-4 z-50 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl"
					style={{ right: "calc(1rem + 20rem + 0.5rem)" }}
					onClick={(e) => e.stopPropagation()}
				>
					<p className="mb-2 text-xs font-medium text-muted-foreground">{t("cardColor")}</p>
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Label className="text-xs text-muted-foreground shrink-0 w-12">{t("color")}</Label>
							<input
								type="color"
								value={editColor || DEFAULT_CARD_COLOR}
								onChange={(e) => setEditColor(e.target.value)}
								className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent shrink-0"
							/>
							<input
								type="text"
								value={editColor}
								onChange={(e) => setEditColor(e.target.value)}
								className="h-8 flex-1 min-w-0 rounded-md border border-input bg-background px-2 text-xs"
								placeholder="#000000"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Label className="text-xs text-muted-foreground shrink-0 w-12">{t("opacity")}</Label>
							<input
								type="range"
								min={0}
								max={100}
								value={editOpacity}
								onChange={(e) => setEditOpacity(Number(e.target.value))}
								className="flex-1 accent-primary min-w-0"
							/>
							<span className="w-9 shrink-0 text-right text-xs text-muted-foreground">{editOpacity}%</span>
						</div>
					</div>
					<div className="mt-3 rounded-lg border border-border overflow-hidden min-h-[44px] flex items-center justify-center">
						<div
							className="w-full min-h-[44px] flex items-center justify-center text-sm font-semibold text-foreground"
							style={previewBackground ? { background: previewBackground } : undefined}
						>
							{asset.name}
						</div>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
						<Button variant="outline" size="sm" className="h-7" onClick={handleCancelColor}>
							{t("cancel")}
						</Button>
						<Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={handleUseDefaultColor}>
							{t("useDefault")}
						</Button>
						<Button size="sm" className="h-7" onClick={handleSaveColor}>
							{t("save")}
						</Button>
					</div>
				</div>
			)}
			{/* 物品信息面板：始终右侧固定，不随调色盘扩展 */}
			<div className="fixed right-4 bottom-4 z-50 w-80 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl">
				<div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
					<span className="text-sm font-medium text-muted-foreground">{t("itemInfo")}</span>
					<Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close")}>
						<X className="size-4" />
					</Button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<Avatar className="h-16 w-16 shrink-0 ring-2 ring-border/50">
								<AvatarFallback
									className="font-geely text-sm font-medium text-white p-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
									style={{ background: avatarBackground }}
								>
									{asset.name.slice(0, 2)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								{editingName ? (
									<div className="flex flex-col gap-2">
										<input
											type="text"
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											className="h-9 rounded-md border border-input bg-background px-2 text-sm font-semibold"
											placeholder={t("namePlaceholder")}
											autoFocus
										/>
										<div className="flex gap-1">
											<Button size="sm" className="h-7" onClick={handleSaveName}>
												{t("save")}
											</Button>
											<Button variant="outline" size="sm" className="h-7" onClick={handleCancelName}>
												{t("cancel")}
											</Button>
										</div>
									</div>
								) : (
									<div className="flex items-center gap-1.5 flex-wrap">
										<p className="truncate font-semibold text-foreground">{asset.name}</p>
										<Button
											variant="ghost"
											size="sm"
											className="h-7 w-7 p-0 text-muted-foreground"
											onClick={openNameEditor}
											aria-label={t("edit")}
										>
											<Pencil className="size-3.5" />
										</Button>
									</div>
								)}
								<div className="flex flex-wrap items-center gap-1.5 mt-0.5">
									<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
										<KindIcon kind={asset.kind} className="size-3.5" />
									</span>
									<KindBadge kind={asset.kind} />
									<Badge variant={getStateBadgeVariant(asset.state)}>
										{getStateLabel(asset.state, t)}
									</Badge>
								</div>
							</div>
						</div>
						<div>
							<div className="flex items-center justify-between gap-2 mb-1">
								<p className="text-xs font-medium text-muted-foreground">{t("description")}</p>
								{!editingDesc ? (
									<Button
										variant="outline"
										size="sm"
										className="h-7 gap-1"
										onClick={openDescEditor}
									>
										<Pencil className="size-3.5" />
										{asset.description != null && asset.description !== "" ? t("edit") : t("add")}
									</Button>
								) : null}
							</div>
							{editingDesc ? (
								<div className="flex flex-col gap-2">
									<textarea
										value={editDesc}
										onChange={(e) => setEditDesc(e.target.value)}
										className="min-h-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-y"
										placeholder={t("descPlaceholder")}
										autoFocus
									/>
									<div className="flex gap-1">
										<Button size="sm" className="h-7" onClick={handleSaveDesc}>
											{t("save")}
										</Button>
										<Button variant="outline" size="sm" className="h-7" onClick={handleCancelDesc}>
											{t("cancel")}
										</Button>
									</div>
								</div>
							) : (
								<p className="text-sm text-foreground whitespace-pre-wrap">
									{asset.description != null && asset.description !== "" ? asset.description : "—"}
								</p>
							)}
						</div>
						{(asset.quantity != null || asset.unit) && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">{t("quantity")}</p>
								<p className="text-sm">
									{qtyText}
									{asset.reorderPoint != null && (
										<span className="text-muted-foreground ml-2">{t("reorderLine")} {asset.reorderPoint}</span>
									)}
								</p>
							</div>
						)}
						{(asset.nextDueAt ?? asset.dueAt ?? asset.expiresAt) && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">{t("due")}</p>
								<p className="text-sm">
									{formatDate(asset.nextDueAt ?? asset.dueAt ?? asset.expiresAt ?? null)}
								</p>
							</div>
						)}
						{asset.refUrl && (
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-1">{t("link")}</p>
								<a
									href={asset.refUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
								>
									<ExternalLink className="size-3.5" />
									{asset.refUrl}
								</a>
							</div>
						)}
						<div className="min-h-9">
							<div className="flex min-h-7 items-center justify-between">
								<p className="text-xs font-medium text-muted-foreground">{t("cardColor")}</p>
								{!editingColor ? (
									<Button
										variant="outline"
										size="sm"
										className="h-7 gap-1"
										onClick={openColorEditor}
									>
										<Palette className="size-3.5" />
										{t("edit")}
									</Button>
								) : (
									<span className="h-7 w-14 shrink-0" aria-hidden />
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
