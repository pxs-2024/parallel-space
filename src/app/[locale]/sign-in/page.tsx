import { CardCompact } from "@/components/card-compact";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { AuthPageHero } from "@/features/auth/components/auth-page-hero";
import { passwordForgotPath, signUpPath } from "@/paths";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const SignInPage = async () => {
	const t = await getTranslations("auth");
	return (
		<div className="relative flex flex-1 flex-col justify-center items-center">
			<AuthPageHero />
			<CardCompact
				title={t("signIn")}
				description={t("signInDescription")}
				className="w-full max-w-[420px] animate-fade-in-from-top"
				content={<SignInForm />}
				footer={
					<div className="w-full flex justify-between">
						<Link className="text-sm text-muted-foreground" href={signUpPath()}>
							{t("noAccountYet")}
						</Link>
						<Link className="text-sm text-muted-foreground" href={passwordForgotPath()}>
							{t("forgotPassword")}
						</Link>
					</div>
				}
			/>
		</div>
	);
};

export default SignInPage;
