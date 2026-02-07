"use client";

import { ListSearchInput } from "./list-search-input";
import { ListKindSelect } from "./list-kind-select";
import { ListStateSelect } from "./list-state-select";
import { ListSortSelect } from "./list-sort-select";

type ListFiltersBarProps = {
	/** 可选：在右侧展示的数量信息，如 "3 / 10" */
	countSlot?: React.ReactNode;
	/** 可选：空间筛选（仅全局搜索面板使用） */
	spaceFilterSlot?: React.ReactNode;
};

const ListFiltersBar = ({ countSlot, spaceFilterSlot }: ListFiltersBarProps) => {
	return (
		<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/10 px-4 py-3">
			<ListSearchInput />
			{spaceFilterSlot}
			<ListKindSelect />
			<ListStateSelect />
			<ListSortSelect />
			{countSlot}
		</div>
	);
};

export { ListFiltersBar };
