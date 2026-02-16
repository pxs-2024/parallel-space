"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	LIST_SORT_FIELDS,
	LIST_ORDER,
	type ListSearchParams,
} from "../search-params";

const KIND_OPTIONS = [
	{ value: "", labelKey: "allKinds" as const },
	{ value: "STATIC", labelKey: "kindStatic" as const },
	{ value: "CONSUMABLE", labelKey: "kindConsumable" as const },
	{ value: "TEMPORAL", labelKey: "kindTemporal" as const },
] as const;

const STATE_OPTIONS = [
	{ value: "", labelKey: "allStates" as const },
	{ value: "ACTIVE", labelKey: "stateActive" as const },
	{ value: "PENDING", labelKey: "statePending" as const },
	{ value: "PAUSED", labelKey: "statePaused" as const },
	{ value: "DISCARDED", labelKey: "stateDiscarded" as const },
] as const;

const SORT_KEYS: Record<(typeof LIST_SORT_FIELDS)[number], string> = {
	createdAt: "sortCreatedAt",
	name: "sortName",
	kind: "sortKind",
	state: "sortState",
	quantity: "sortQuantity",
};

const ORDER_KEYS: Record<(typeof LIST_ORDER)[number], string> = {
	asc: "asc",
	desc: "desc",
};

type SpaceItem = { id: string; name: string };

type GlobalSearchFiltersBarProps = {
	draft: ListSearchParams;
	onDraftChange: (patch: Partial<ListSearchParams>) => void;
	onSearch: () => void;
	onReset: () => void;
	spaces: SpaceItem[];
	/** 第一行右侧插槽，如关闭按钮 */
	rightSlot?: React.ReactNode;
};

export function GlobalSearchFiltersBar({
	draft,
	onDraftChange,
	onSearch,
	onReset,
	spaces,
	rightSlot,
}: GlobalSearchFiltersBarProps) {
	const t = useTranslations("filters");
	const tAsset = useTranslations("asset");
	const selectClass = "h-9 w-full min-w-0";
	return (
		<div className="flex shrink-0 flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3">
			{/* 搜索框 + 搜索/重置 + 右侧插槽（如关闭）：第一行 */}
			<div className="flex items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("searchPlaceholder")}
						value={draft.q}
						onChange={(e) => onDraftChange({ q: e.target.value })}
						className="h-9 pl-8"
						onKeyDown={(e) => e.key === "Enter" && onSearch()}
					/>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button size="sm" className="h-9 w-14 shrink-0" onClick={onSearch}>
						{t("search")}
					</Button>
					<Button size="sm" variant="outline" className="h-9 w-14 shrink-0" onClick={onReset}>
						{t("reset")}
					</Button>
					{rightSlot}
				</div>
			</div>
			{/* 筛选条件 + 搜索/重置按钮：第二行及以后 */}
			<div className="flex flex-col gap-2">
				<div className="grid grid-cols-3 gap-2">
				<Select
					value={draft.spaceId || "__all__"}
					onValueChange={(v) =>
						onDraftChange({ spaceId: v === "__all__" ? "" : v })
					}
				>
					<SelectTrigger className={selectClass}>
						<SelectValue placeholder={t("space")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all__">{t("allSpaces")}</SelectItem>
						{spaces.map((s) => (
							<SelectItem key={s.id} value={s.id}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={draft.kind || "__all__"}
					onValueChange={(v) =>
						onDraftChange({ kind: v === "__all__" ? "" : v })
					}
				>
					<SelectTrigger className={selectClass}>
						<SelectValue placeholder={t("kind")} />
					</SelectTrigger>
					<SelectContent>
						{KIND_OPTIONS.map((opt) => (
							<SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
								{t(opt.labelKey)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={draft.state || "__all__"}
					onValueChange={(v) =>
						onDraftChange({ state: v === "__all__" ? "" : v })
					}
				>
					<SelectTrigger className={selectClass}>
						<SelectValue placeholder={t("state")} />
					</SelectTrigger>
					<SelectContent>
						{STATE_OPTIONS.map((opt) => (
							<SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
								{opt.labelKey === "allStates" ? t("allStates") : tAsset(opt.labelKey)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Select
						value={draft.sort}
						onValueChange={(v) =>
							onDraftChange({ sort: v as (typeof LIST_SORT_FIELDS)[number] })
						}
					>
						<SelectTrigger className={selectClass}>
							<SelectValue placeholder={t("sort")} />
						</SelectTrigger>
						<SelectContent>
							{LIST_SORT_FIELDS.map((field) => (
								<SelectItem key={field} value={field}>
									{t(SORT_KEYS[field])}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={draft.order}
						onValueChange={(v) =>
							onDraftChange({ order: v as (typeof LIST_ORDER)[number] })
						}
					>
						<SelectTrigger className={selectClass}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{LIST_ORDER.map((o) => (
								<SelectItem key={o} value={o}>
									{t(ORDER_KEYS[o])}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
