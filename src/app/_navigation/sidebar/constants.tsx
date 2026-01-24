import { accountProfilePath, homePath, spacesPath } from "@/paths";
import { LucideBook, LucideCircleUser, LucideLibrary } from "lucide-react";
import { NavItem } from "./types";

export const navItems: NavItem[] = [
	{
		title: "decisions",
		icon: <LucideLibrary></LucideLibrary>,
		href: homePath(),
	},
	{
		title: "spaces",
		icon: <LucideBook></LucideBook>,
		href: spacesPath(),
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
