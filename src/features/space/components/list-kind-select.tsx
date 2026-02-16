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

const KIND_OPTIONS = [
	{ value: "", label: "全部种类" },
	{ value: "STATIC", label: "静态" },
	{ value: "CONSUMABLE", label: "消耗型" },
	{ value: "TEMPORAL", label: "时间型" },
] as const;

const ListKindSelect = () => {
	const [query, setQuery] = useQueryStates(listSearchParsers, listSearchOptions);

	return (
		<Select
			value={query.kind || "__all__"}
			onValueChange={(v) => setQuery({ kind: v === "__all__" ? "" : v, page: 1 })}
		>
			<SelectTrigger className="w-28">
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
	);
};

export { ListKindSelect };
