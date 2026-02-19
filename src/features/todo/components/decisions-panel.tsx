"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useQueryStates, parseAsString } from "nuqs";
import { Input } from "@/components/ui/input";
import type {
	PendingRestockItem,
	PendingNewAssetItem,
} from "@/features/todo/queries/get-todo-page-data";
import {
	DecisionCard,
	getDecisionItemKey,
	getItemCreatedAt,
	type DecisionItem,
} from "@/features/todo/components/decision-card";

const SEARCH_DEBOUNCE_MS = 300;

function toItems(pending: PendingRestockItem[], newAssets: PendingNewAssetItem[]): DecisionItem[] {
	const list: DecisionItem[] = [
		...pending.map((data) => ({ kind: "pending" as const, data })),
		...newAssets.map((data) => ({ kind: "newAsset" as const, data })),
	];
	list.sort((a, b) => getItemCreatedAt(b).getTime() - getItemCreatedAt(a).getTime());
	return list;
}

function getItemSearchText(item: DecisionItem): string {
	if (item.kind === "newAsset") return `${item.data.spaceName} ${item.data.name}`;
	return `${item.data.spaceName} ${item.data.assetName}`;
}

type DecisionsPanelProps = {
	pending: PendingRestockItem[];
	newAssets: PendingNewAssetItem[];
	spaceOptions?: { id: string; name: string }[];
};

export function DecisionsPanel({ pending, newAssets, spaceOptions = [] }: DecisionsPanelProps) {
	const router = useRouter();
	const [items, setItems] = useState<DecisionItem[]>(() => toItems(pending, newAssets));
	const [query, setQuery] = useQueryStates({ q: parseAsString.withDefault("") }, { shallow: false });
	const [searchInput, setSearchInput] = useState(query.q);
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setSearchInput(query.q);
	}, [query.q]);

	useEffect(() => {
		setItems(toItems(pending, newAssets));
	}, [pending, newAssets]);

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

	const handleRemoving = useCallback((key: string) => {
		setItems((prev) => prev.filter((i) => getDecisionItemKey(i) !== key));
		setTimeout(() => router.refresh(), 280);
	}, [router]);

	const filteredItems = useMemo(() => {
		const q = query.q.trim().toLowerCase();
		if (!q) return items;
		return items.filter((item) => getItemSearchText(item).toLowerCase().includes(q));
	}, [items, query.q]);

	const isEmpty = items.length === 0;
	const hasNoResults = !isEmpty && filteredItems.length === 0;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex shrink-0 flex-wrap items-center gap-3">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="搜索空间或物品"
						value={searchInput}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="pl-9"
					/>
				</div>
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
				<div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
					{filteredItems.map((item) => {
						const key = getDecisionItemKey(item);
						const safeName = `card-${key.replace(/[^a-zA-Z0-9-]/g, "-")}`;
						return (
							<div
								key={key}
								className="flex min-w-0 transition-[margin] duration-300 ease-out"
								style={{ viewTransitionName: safeName } as React.CSSProperties}
							>
								<DecisionCard item={item} onRemoving={handleRemoving} spaceOptions={spaceOptions} />
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
