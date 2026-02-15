import { accountProfilePath, todoPath, historyPath, spacesPath, aiSuggestionsPath } from "@/paths";
import { LucideBook, LucideCircleUser, LucideHistory, LucideLibrary, LucideSparkles } from "lucide-react";
import { NavItem } from "./types";

export const navItems: NavItem[] = [
	{
		title: "todo",
		icon: <LucideLibrary />,
		href: todoPath(),
	},
	{
		title: "spaces",
		icon: <LucideBook />,
		href: spacesPath(),
	},
	{
		title: "aiSuggestions",
		icon: <LucideSparkles />,
		href: aiSuggestionsPath(),
	},
	{
		title: "history",
		icon: <LucideHistory />,
		href: historyPath(),
	},
	{
		separator: true,
		title: "account",
		icon: <LucideCircleUser />,
		href: accountProfilePath(),
	},
];
export const closedClassName =
	"text-background opacity-0 transition-all duration-300 group-hover:z-40 group-hover:ml-4 group-hover:rounded group-hover-bg-foreground ground-hover:p-2 group-hover:opacity-100";
