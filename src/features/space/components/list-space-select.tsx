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

type SpaceItem = { id: string; name: string };

type ListSpaceSelectProps = {
	spaces: SpaceItem[];
};

const ListSpaceSelect = ({ spaces }: ListSpaceSelectProps) => {
	const [query, setQuery] = useQueryStates(listSearchParsers, listSearchOptions);

	return (
		<Select
			value={query.spaceId || "__all__"}
			onValueChange={(v) => setQuery({ spaceId: v === "__all__" ? "" : v, page: 1 })}
		>
			<SelectTrigger className="w-28">
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
	);
};

export { ListSpaceSelect };
