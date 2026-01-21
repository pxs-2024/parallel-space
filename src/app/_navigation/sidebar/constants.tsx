import { accountProfilePath, homePath } from "@/paths";
import { LucideBook, LucideCircleUser, LucideLibrary } from "lucide-react";
import { NavItem } from "./types";

export const navItems: NavItem[] = [
	{
		title: "Home",
		icon: <LucideLibrary></LucideLibrary>,
		href: homePath(),
	},
	{
		title: "Home2",
		icon: <LucideBook></LucideBook>,
		href: homePath(),
	},
	{
		separator: true,
		title: "Account",
		icon: <LucideCircleUser />,
		href: accountProfilePath(),
	},
];
export const closedClassName =
	"text-background opacity-0 transition-all duration-300 group-hover:z-40 group-hover:ml-4 group-hover:rounded group-hover-bg-foreground ground-hover:p-2 group-hover:opacity-100";
