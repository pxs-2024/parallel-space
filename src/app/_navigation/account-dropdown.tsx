import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions/sign-out";
import { accountPasswordPath, accountProfilePath } from "@/paths";
import { LucideLock, LucideLogOut, LucideUser } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserPublic } from "@/lib/auth/types";
import { useTranslations } from "next-intl";

type AccountDropdownProps = {
	user: UserPublic;
};

const AccountDropdown = ({ user }: AccountDropdownProps) => {
	const t = useTranslations("account");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar>
					<AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel className="text-sm text-muted-foreground ">
					{t("myAccount")}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href={accountProfilePath()}>
						<LucideUser className="mr-2 h-4 w-4" />
						<span>{t("profile")}</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href={accountPasswordPath()}>
						<LucideLock className="mr-2 h-4 w-4" />
						<span>{t("password")}</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<form action={signOut}>
						<LucideLogOut className="mr-2 h-4 w-4" />
						<button type="submit">{t("signOut")}</button>
					</form>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export { AccountDropdown };
