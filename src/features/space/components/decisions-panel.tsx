"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { PendingConfirmAction } from "@/features/space/queries/get-all-assets-for-decisions";
import type { SuggestedAction } from "@/features/space/queries/decision-rules";
import {
	DecisionCard,
	getDecisionItemKey,
	type DecisionItem,
} from "@/features/space/components/decision-card";

const DECISION_TYPE_OPTIONS = ["all", "RESTOCK", "REMIND", "DISCARD"] as const;
const DECISION_TIME_OPTIONS = ["all", "overdue", "week", "month"] as const;
const SEARCH_DEBOUNCE_MS = 300;

const decisionQueryParsers = {
	q: parseAsString.withDefault(""),
	type: parseAsStringLiteral(DECISION_TYPE_OPTIONS).withDefault("all"),
	time: parseAsStringLiteral(DECISION_TIME_OPTIONS).withDefault("all"),
};

function buildMergedItems(
	pending: PendingConfirmAction[],
	suggested: SuggestedAction[]
): DecisionItem[] {
	const pendingItems: DecisionItem[] = pending.map((data) => ({ kind: "pending", data }));
	const suggestedItems: DecisionItem[] = suggested.map((data) => ({
		kind: "suggestion",
		data,
	}));
	return [...pendingItems, ...suggestedItems];
}

function getItemType(item: DecisionItem): "RESTOCK" | "REMIND" | "DISCARD" {
	return item.kind === "pending" ? item.data.type : item.data.type;
}

function getItemDueAt(item: DecisionItem): Date | null {
	const d = item.kind === "pending" ? item.data.dueAt : item.data.dueAt;
	return d ?? null;
}

function getItemSearchText(item: DecisionItem): string {
	const name = item.kind === "pending" ? item.data.assetName : item.data.assetName;
	const space = item.kind === "pending" ? item.data.spaceName : item.data.spaceName;
	return `${space} ${name}`;
}

type DecisionsPanelProps = {
	pending: PendingConfirmAction[];
	suggested: SuggestedAction[];
};

export function DecisionsPanel({ pending, suggested }: DecisionsPanelProps) {
	const [items, setItems] = React.useState<DecisionItem[]>(() =>
		buildMergedItems(pending, suggested)
	);
	const [query, setQuery] = useQueryStates(decisionQueryParsers, { shallow: false });
	const [searchInput, setSearchInput] = React.useState(query.q);
	const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	React.useEffect(() => {
		setSearchInput(query.q);
	}, [query.q]);

	React.useEffect(() => {
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
	}, []);

	const handleSearchChange = React.useCallback(
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

	React.useEffect(() => {
		setItems(buildMergedItems(pending, suggested));
	}, [pending, suggested]);

	const handleRemoving = React.useCallback((key: string) => {
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

	const filteredItems = React.useMemo(() => {
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
		if (query.time !== "all") {
			const now = Date.now();
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
	}, [items, query.q, query.type, query.time]);

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
					暂无待决策项
				</div>
			) : hasNoResults ? (
				<div className="rounded-xl border bg-muted/30 px-4 py-8 text-center text-muted-foreground">
					暂无符合条件项
				</div>
			) : (
				<div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
					{filteredItems.map((item) => {
						const key = getDecisionItemKey(item);
						const safeName = `card-${key.replace(/[^a-zA-Z0-9-]/g, "-")}`;
						return (
							<div
								key={key}
								className="min-w-0 transition-[margin] duration-300 ease-out"
								style={{
									viewTransitionName: safeName,
								} as React.CSSProperties}
							>
								<DecisionCard item={item} onRemoving={handleRemoving} />
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
