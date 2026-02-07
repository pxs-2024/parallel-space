"use client";

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
	{ value: "", label: "全部种类" },
	{ value: "STATIC", label: "静态" },
	{ value: "CONSUMABLE", label: "消耗型" },
	{ value: "TEMPORAL", label: "时间型" },
	{ value: "VIRTUAL", label: "虚拟型" },
] as const;

const STATE_OPTIONS = [
	{ value: "", label: "全部状态" },
	{ value: "ACTIVE", label: "在用" },
	{ value: "PENDING_RESTOCK", label: "待补充" },
	{ value: "PENDING_DISCARD", label: "待废弃" },
	{ value: "ARCHIVED", label: "已归档" },
	{ value: "DISCARDED", label: "已废弃" },
] as const;

const SORT_LABELS: Record<(typeof LIST_SORT_FIELDS)[number], string> = {
	createdAt: "创建时间",
	name: "名称",
	kind: "种类",
	state: "状态",
	quantity: "数量",
};

const ORDER_LABELS: Record<(typeof LIST_ORDER)[number], string> = {
	asc: "升序",
	desc: "降序",
};

type SpaceItem = { id: string; name: string };

type GlobalSearchFiltersBarProps = {
	draft: ListSearchParams;
	onDraftChange: (patch: Partial<ListSearchParams>) => void;
	onSearch: () => void;
	onReset: () => void;
	spaces: SpaceItem[];
};

export function GlobalSearchFiltersBar({
	draft,
	onDraftChange,
	onSearch,
	onReset,
	spaces,
}: GlobalSearchFiltersBarProps) {
	const selectClass = "h-9 w-full min-w-0";
	return (
		<div className="flex shrink-0 flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3">
			{/* 搜索框 + 搜索/重置：第一行 */}
			<div className="flex items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="搜索名称或描述..."
						value={draft.q}
						onChange={(e) => onDraftChange({ q: e.target.value })}
						className="h-9 pl-8"
						onKeyDown={(e) => e.key === "Enter" && onSearch()}
					/>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button size="sm" className="h-9 w-14 shrink-0" onClick={onSearch}>
						搜索
					</Button>
					<Button size="sm" variant="outline" className="h-9 w-14 shrink-0" onClick={onReset}>
						重置
					</Button>
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
						<SelectValue placeholder="空间" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all__">全部空间</SelectItem>
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
						<SelectValue placeholder="种类" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all__">{KIND_OPTIONS[0].label}</SelectItem>
						{KIND_OPTIONS.slice(1).map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
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
						<SelectValue placeholder="状态" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all__">{STATE_OPTIONS[0].label}</SelectItem>
						{STATE_OPTIONS.slice(1).map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
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
							<SelectValue placeholder="排序" />
						</SelectTrigger>
						<SelectContent>
							{LIST_SORT_FIELDS.map((field) => (
								<SelectItem key={field} value={field}>
									{SORT_LABELS[field]}
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
									{ORDER_LABELS[o]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
