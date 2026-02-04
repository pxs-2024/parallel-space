"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { PendingConfirmAction } from "@/features/todo/queries/get-todo-page-data";
import {
	DecisionCard,
	getDecisionItemKey,
	type DecisionItem,
} from "@/features/todo/components/decision-card";
import { snoozeActions } from "@/features/todo/actions/respond-to-action";

const DECISION_TYPE_OPTIONS = ["all", "RESTOCK", "REMIND", "DISCARD"] as const;
const DECISION_TIME_OPTIONS = ["all", "overdue", "week", "month"] as const;
const SEARCH_DEBOUNCE_MS = 300;

const decisionQueryParsers = {
	q: parseAsString.withDefault(""),
	type: parseAsStringLiteral(DECISION_TYPE_OPTIONS).withDefault("all"),
	time: parseAsStringLiteral(DECISION_TIME_OPTIONS).withDefault("all"),
};

function toItems(pending: PendingConfirmAction[]): DecisionItem[] {
	return pending.map((data) => ({ kind: "pending", data }));
}

function getItemType(item: DecisionItem): "RESTOCK" | "REMIND" | "DISCARD" {
	return item.data.type;
}

function getItemDueAt(item: DecisionItem): Date | null {
	return item.data.dueAt ?? null;
}

function getItemSearchText(item: DecisionItem): string {
	return `${item.data.spaceName} ${item.data.assetName}`;
}

type DecisionsPanelProps = {
	pending: PendingConfirmAction[];
};

export function DecisionsPanel({ pending }: DecisionsPanelProps) {
	const router = useRouter();
	const [items, setItems] = useState<DecisionItem[]>(() => toItems(pending));
	const [query, setQuery] = useQueryStates(decisionQueryParsers, { shallow: false });
	const [searchInput, setSearchInput] = useState(query.q);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [batchBusy, setBatchBusy] = useState(false);
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setSearchInput(query.q);
	}, [query.q]);

	useEffect(() => {
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
	}, []);

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchInput(value);
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
			searchDebounceRef.current = setTimeout(() => {
				searchDebounceRef.current = null;
				setQuery({ q: value });
			}, SEARCH_DEBOUNCE_MS);
		},
		[setQuery]
	);

	useEffect(() => {
		setItems(toItems(pending));
	}, [pending]);

	const [now, setNow] = useState(0);
	useEffect(() => {
		if (query.time !== "all") {
			setNow(Date.now());
		}
	}, [query.time]);

	const filteredItems = useMemo(() => {
		let result = items;
		const q = query.q.trim().toLowerCase();
		if (q) {
			result = result.filter((item) =>
				getItemSearchText(item).toLowerCase().includes(q)
			);
		}
		if (query.type !== "all") {
			result = result.filter((item) => getItemType(item) === query.type);
		}
		if (query.time !== "all" && now > 0) {
			const weekMs = 7 * 24 * 60 * 60 * 1000;
			const monthMs = 30 * 24 * 60 * 60 * 1000;
			result = result.filter((item) => {
				const due = getItemDueAt(item);
				if (!due) return query.time === "all";
				const t = due.getTime();
				if (query.time === "overdue") return t <= now;
				if (query.time === "week") return t > now && t - now <= weekMs;
				if (query.time === "month") return t > now && t - now <= monthMs;
				return true;
			});
		}
		return result;
	}, [items, query.q, query.type, query.time, now]);

	const handleRemoving = useCallback((key: string) => {
		const remove = () =>
			setItems((prev) => prev.filter((i) => getDecisionItemKey(i) !== key));

		setTimeout(() => {
			const doc = typeof document !== "undefined" ? document : null;
			const startVT = doc && "startViewTransition" in doc ? (doc as { startViewTransition: (cb: () => void) => void }).startViewTransition : null;
			if (startVT) {
				startVT.call(doc, remove);
			} else {
				remove();
			}
		}, 280);
	}, []);

	const toggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const allFilteredSelected =
		filteredItems.length > 0 &&
		filteredItems.every((i) => selectedIds.has(i.data.id));

	const toggleSelectAll = useCallback(() => {
		if (allFilteredSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(filteredItems.map((i) => i.data.id)));
		}
	}, [filteredItems, allFilteredSelected]);

	const handleBatchIgnore = useCallback(async () => {
		if (selectedIds.size === 0) return;
		setBatchBusy(true);
		try {
			const res = await snoozeActions(Array.from(selectedIds), "ignore_day");
			if (res.ok && res.count) {
				const doc = typeof document !== "undefined" ? document : null;
				const startVT = doc && "startViewTransition" in doc ? (doc as { startViewTransition: (cb: () => void) => void }).startViewTransition : null;
				const removeAll = () => {
					setItems((prev) =>
						prev.filter((i) => !selectedIds.has(i.data.id))
					);
					setSelectedIds(new Set());
				};
				if (startVT) {
					startVT.call(doc, removeAll);
				} else {
					removeAll();
				}
				setTimeout(() => router.refresh(), 280);
			}
		} finally {
			setBatchBusy(false);
		}
	}, [selectedIds, router]);

	const isEmpty = items.length === 0;
	const hasNoResults = !isEmpty && filteredItems.length === 0;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex shrink-0 flex-wrap items-center gap-3">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="搜索空间或资产"
						value={searchInput}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={query.type}
					onValueChange={(v) => setQuery({ type: v as typeof query.type })}
				>
					<SelectTrigger className="w-[120px]">
						<SelectValue placeholder="类型" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">全部类型</SelectItem>
						<SelectItem value="RESTOCK">补充</SelectItem>
						<SelectItem value="REMIND">到期</SelectItem>
						<SelectItem value="DISCARD">待丢弃</SelectItem>
					</SelectContent>
				</Select>
				<Select
					value={query.time}
					onValueChange={(v) => setQuery({ time: v as typeof query.time })}
				>
					<SelectTrigger className="w-[120px]">
						<SelectValue placeholder="时间" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">全部时间</SelectItem>
						<SelectItem value="overdue">已过期</SelectItem>
						<SelectItem value="week">本周内</SelectItem>
						<SelectItem value="month">本月内</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{isEmpty ? (
				<div className="rounded-xl border bg-muted/30 px-4 py-8 text-center text-muted-foreground">
					暂无待办项
				</div>
			) : hasNoResults ? (
				<div className="rounded-xl border bg-muted/30 px-4 py-8 text-center text-muted-foreground">
					暂无符合条件项
				</div>
			) : (
				<>
					<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/10 pb-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={toggleSelectAll}
						>
							{allFilteredSelected ? "取消全选" : "全选当前页"}
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={handleBatchIgnore}
							disabled={selectedIds.size === 0 || batchBusy}
						>
							{batchBusy ? "处理中…" : `批量忽略（今日）${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
						</Button>
					</div>
					<div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
						{filteredItems.map((item) => {
							const key = getDecisionItemKey(item);
							const safeName = `card-${key.replace(/[^a-zA-Z0-9-]/g, "-")}`;
							const checked = selectedIds.has(item.data.id);
							return (
								<div
									key={key}
									className="flex min-w-0 items-start gap-3 transition-[margin] duration-300 ease-out"
									style={{
										viewTransitionName: safeName,
									} as React.CSSProperties}
								>
									<label className="flex shrink-0 items-center gap-2 pt-4">
										<input
											type="checkbox"
											checked={checked}
											onChange={() => toggleSelect(item.data.id)}
											className="size-4 rounded border-input"
											aria-label={`选择 ${item.data.assetName}`}
										/>
									</label>
									<div className="min-w-0 flex-1">
										<DecisionCard item={item} onRemoving={handleRemoving} />
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
