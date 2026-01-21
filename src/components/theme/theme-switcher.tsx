"use client";

import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import { LucideSun, LucideMoon } from "lucide-react";
import { useTranslations } from "next-intl";

const ThemeSwitcher = () => {
	const { theme, setTheme } = useTheme();
	const t = useTranslations("nav");
	return (
		<Button
			variant="outline"
			size="icon"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
		>
			<LucideSun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<LucideMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">{t("themeToggle")}</span>
		</Button>
	);
};

export { ThemeSwitcher };
