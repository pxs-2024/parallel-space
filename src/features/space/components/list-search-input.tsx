"use client";

import { useQueryStates } from "nuqs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listSearchParsers, listSearchOptions } from "../search-params";

const ListSearchInput = () => {
	const [query, setQuery] = useQueryStates(listSearchParsers, listSearchOptions);

	return (
		<div className="relative min-w-48 max-w-sm flex-1">
			<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder="搜索名称或描述..."
				value={query.q}
				onChange={(e) => setQuery({ q: e.target.value, page: 1 })}
				className="pl-8"
			/>
		</div>
	);
};

export { ListSearchInput };
