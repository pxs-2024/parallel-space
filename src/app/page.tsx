import { decisionsPath } from "@/paths";
import { redirect } from '@/i18n/navigation'
import { useLocale } from "next-intl";

const RedirectPage = () => {
	const locale = useLocale();
	redirect({ href: decisionsPath(), locale: locale });
}

export default RedirectPage;