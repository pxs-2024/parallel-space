"use client";

import { useQueryStates } from "nuqs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { listSearchParsers, listSearchOptions } from "../search-params";

const STATE_OPTIONS = [
	{ value: "", label: "全部状态" },
	{ value: "ACTIVE", label: "在用" },
	{ value: "PENDING_RESTOCK", label: "待补充" },
	{ value: "PENDING_DISCARD", label: "待废弃" },
	{ value: "ARCHIVED", label: "已归档" },
	{ value: "DISCARDED", label: "已废弃" },
] as const;

const ListStateSelect = () => {
	const [query, setQuery] = useQueryStates(listSearchParsers, listSearchOptions);

	return (
		<Select
			value={query.state || "__all__"}
			onValueChange={(v) => setQuery({ state: v === "__all__" ? "" : v, page: 1 })}
		>
			<SelectTrigger className="w-28">
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
	);
};

export { ListStateSelect };
