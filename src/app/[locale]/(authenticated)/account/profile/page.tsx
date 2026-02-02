import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { CardCompact } from "@/components/card-compact";
import { accountPasswordPath } from "@/paths";
import { Link } from "@/i18n/navigation";

const ProfilePage = async () => {
	const auth = await getAuthOrRedirect();

	return (
		<div className="flex-1 flex flex-col justify-center items-center">
			<CardCompact
				title="个人资料"
				description="修改用户名和邮箱"
				className="w-full max-w-[420px]"
				content={<ProfileForm user={auth.user} />}
				footer={
					<Link
						className="text-sm text-muted-foreground hover:underline"
						href={accountPasswordPath()}
					>
						修改密码
					</Link>
				}
			/>
		</div>
	);
};

export default ProfilePage;
