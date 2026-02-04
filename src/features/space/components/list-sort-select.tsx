"use client";

import { useQueryStates } from "nuqs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { sortParser, sortOptions, LIST_SORT_FIELDS, LIST_ORDER } from "../search-params";

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

const ListSortSelect = () => {
	const [sort, setSort] = useQueryStates(sortParser, sortOptions);

	return (
		<>
			<Select
				value={sort.sort}
				onValueChange={(v) => setSort({ sort: v as (typeof LIST_SORT_FIELDS)[number] })}
			>
				<SelectTrigger className="w-28">
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
				value={sort.order}
				onValueChange={(v) => setSort({ order: v as (typeof LIST_ORDER)[number] })}
			>
				<SelectTrigger className="w-24">
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
		</>
	);
};

export { ListSortSelect };
