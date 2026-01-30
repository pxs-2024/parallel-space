import { accountProfilePath, decisionsPath, historyPath, spacesPath } from "@/paths";
import { LucideBook, LucideCircleUser, LucideHistory, LucideLibrary } from "lucide-react";
import { NavItem } from "./types";

export const navItems: NavItem[] = [
	{
		title: "decisions",
		icon: <LucideLibrary />,
		href: decisionsPath(),
	},
	{
		title: "spaces",
		icon: <LucideBook />,
		href: spacesPath(),
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
