"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { homePath, signInPath, signUpPath } from "@/paths";
import { LucideBadge } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeSwitcher } from "../../components/theme/theme-switcher";
import { buttonVariants } from "../../components/ui/button";
import { AccountDropdown } from "./account-dropdown";
import { useTranslations } from "next-intl";
import { LocalSwitch } from "@/components/i18n/local-switch";

const Header = () => {
	const { user, isFetched } = useAuth();
	const t = useTranslations("nav");
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
				{t("signUp")}
			</Link>
			<Link
				className={buttonVariants({
					variant: "default",
				})}
				href={signInPath()}
			>
				{t("signIn")}							
			</Link>
		</>
	);

	return (
		<nav
			className="
						animate-header-from-top
						supports-backdrop-blur:bg-background/60
						fixed left-0 right-0 top-0 z-20
						border-b bg-background/95 opacity-60
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
					<h1 className="ml-2 text-lg font-semibold">{t("title")}</h1>
				</Link>
			</div>
			<div className="flex align-items gap-x-2">
				<LocalSwitch />	
				<ThemeSwitcher />
				{navItems}
			</div>
		</nav>
	);
};

export { Header };
