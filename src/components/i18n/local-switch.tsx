import { redirect, usePathname } from "@/i18n/navigation";
import { LucideLanguages } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useTranslations } from "next-intl";
const LocalSwitch = () => {
	const pathname = usePathname();

	const switchTo = (locale: "zh" | "en") => {
		redirect({ href: pathname, locale: locale });
	};
	
	const t = useTranslations("nav");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon">
					<LucideLanguages />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel className="text-sm text-muted-foreground">{t("language")}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<div onClick={() => switchTo("zh")}>
						<span className="mr-2">CN</span>
						<span>中文</span>
					</div>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<div onClick={() => switchTo("en")}>
						<span className="mr-2">US</span>
						<span>English</span>
					</div>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export { LocalSwitch };
