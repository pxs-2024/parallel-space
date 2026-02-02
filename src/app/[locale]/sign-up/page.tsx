import { CardCompact } from "@/components/card-compact";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { signInPath } from "@/paths";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const SignUpPage = async () => {
	const t = await getTranslations("auth");
	return (
		<div className="flex-1 flex flex-col justify-center items-center">
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
