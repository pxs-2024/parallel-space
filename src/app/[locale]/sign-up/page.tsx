import { CardCompact } from "@/components/card-compact";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { AuthPageHero } from "@/features/auth/components/auth-page-hero";
import { signInPath } from "@/paths";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const SignUpPage = async () => {
	const t = await getTranslations("auth");
	return (
		<div className="relative flex flex-1 flex-col justify-center items-center">
			<AuthPageHero />
			<CardCompact
				title={t("signUp")}
				description={t("signUpDescription")}
				className="w-full max-w-[420px] animate-fade-in-from-top"
				content={<SignUpForm />}
				footer={
					<Link className="text-sm text-muted-foreground" href={signInPath()}>
						{t("haveAccount")}
					</Link>
				}
			/>
		</div>
	);
};

export default SignUpPage;
