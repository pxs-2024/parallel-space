import {
	createSearchParamsCache,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs/server";

export const LIST_SORT_FIELDS = ["name", "kind", "state", "quantity", "createdAt"] as const;
export const LIST_ORDER = ["asc", "desc"] as const;

const listSearchParserOptions = {
	shallow: false,
	clearOnDefault: true,
} as const;

export const searchParser = parseAsString
	.withDefault("")
	.withOptions(listSearchParserOptions);
export const kindParser = parseAsString
	.withDefault("")
	.withOptions(listSearchParserOptions);
export const stateParser = parseAsString
	.withDefault("")
	.withOptions(listSearchParserOptions);

const sortFieldParser = parseAsStringLiteral(LIST_SORT_FIELDS)
	.withDefault("createdAt")
	.withOptions(listSearchParserOptions);
const orderFieldParser = parseAsStringLiteral(LIST_ORDER)
	.withDefault("desc")
	.withOptions(listSearchParserOptions);

/** 排序相关 query（sort + order），供 ListSortSelect 等客户端组件 useQueryStates(sortParser, sortOptions) 使用 */
export const sortParser = {
	sort: sortFieldParser,
	order: orderFieldParser,
};

export const sortOptions = listSearchParserOptions;

/** 仅搜索关键词（q），供 ListSearchInput 使用 useQueryStates(searchParser, listSearchOptions) */
export const searchQueryParser = { q: searchParser };

export const listSearchParsers = {
	...searchQueryParser,
	kind: kindParser,
	state: stateParser,
	...sortParser,
};

export const listSearchOptions = listSearchParserOptions;

export const listSearchParamsCache = createSearchParamsCache(listSearchParsers);

export type ListSearchParams = Awaited<
	ReturnType<typeof listSearchParamsCache.parse>
>;
