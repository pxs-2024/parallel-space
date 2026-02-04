"use client";

import { ListSearchInput } from "./list-search-input";
import { ListKindSelect } from "./list-kind-select";
import { ListStateSelect } from "./list-state-select";
import { ListSortSelect } from "./list-sort-select";

type ListFiltersBarProps = {
	/** 可选：在右侧展示的数量信息，如 "3 / 10" */
	countSlot?: React.ReactNode;
};

const ListFiltersBar = ({ countSlot }: ListFiltersBarProps) => {
	return (
		<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/10 px-4 py-3">
			<ListSearchInput />
			<ListKindSelect />
			<ListStateSelect />
			<ListSortSelect />
			{countSlot}
		</div>
	);
};

export { ListFiltersBar };
