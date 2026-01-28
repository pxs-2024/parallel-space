import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getAuth } from "./get-auth";
import { signInPath } from "@/paths";

export const getAuthOrRedirect = async () => {
	const auth = await getAuth();
	if (!auth) {
		const locale = await getLocale();
		redirect(`/${locale}${signInPath()}`);
	}
	return auth;
};
