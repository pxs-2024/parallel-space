"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { homePath, signInPath, signUpPath } from "@/paths";
import { LucideBadge } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "../../components/theme/theme-switcher";
import { buttonVariants } from "../../components/ui/button";
import { AccountDropdown } from "./account-dropdown";

const Header = () => {
	const { user, isFetched } = useAuth();

	if (!isFetched) {
		return null;
	}

	const navItems = user ? (
		<AccountDropdown user={user} />
	) : (
		<>
			<Link
				className={buttonVariants({
					variant: "outline",
				})}
				href={signUpPath()}
			>
				Sign Up
			</Link>
			<Link
				className={buttonVariants({
					variant: "default",
				})}
				href={signInPath()}
			>
				Sign In
			</Link>
		</>
	);

	return (
		<nav
			className="
						animate-header-from-top
						supports-backdrop-blur:bg-background/60
						fixed left-0 right-0 top-0 z-20
						border-b bg-background/95 backdrop-blur
						w-full flex py-2.5 px-5 justify-between
				"
		>
			<div className="flex align-items gap-x-2">
				<Link
					className={buttonVariants({
						variant: "ghost",
					})}
					href={homePath()}
				>
					<LucideBadge />
					<h1 className="ml-2 text-lg font-semibold">TicketBounty</h1>
				</Link>
			</div>
			<div className="flex align-items gap-x-2">
				<ThemeSwitcher />
				{navItems}
			</div>
		</nav>
	);
};

export { Header };
