import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { PasswordForm } from "@/features/auth/components/password-form";
import { CardCompact } from "@/components/card-compact";
import { accountProfilePath } from "@/paths";
import { Link } from "@/i18n/navigation";

const PasswordPage = async () => {
	await getAuthOrRedirect();

	return (
		<div className="flex-1 flex flex-col justify-center items-center">
			<CardCompact
				title="修改密码"
				description="请输入当前密码和新密码"
				className="w-full max-w-[420px]"
				content={<PasswordForm />}
				footer={
					<Link
						className="text-sm text-muted-foreground hover:underline"
						href={accountProfilePath()}
					>
						返回个人资料
					</Link>
				}
			/>
		</div>
	);
};

export default PasswordPage;
