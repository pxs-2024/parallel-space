"use client";

import { useActionState } from "react";
import { Form } from "@/components/form/form";
import { FieldError } from "@/components/form/field-error";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { updateProfile } from "../actions/update-profile";
import type { UserPublic } from "@/lib/auth/types";

type ProfileFormProps = {
	user: UserPublic;
};

const ProfileForm = ({ user }: ProfileFormProps) => {
	const [actionState, action] = useActionState(updateProfile, EMPTY_ACTION_STATE);

	return (
		<Form action={action} actionState={actionState}>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="username">用户名</Label>
					<Input
						id="username"
						name="username"
						defaultValue={user.username}
						placeholder="用户名"
					/>
					<FieldError actionState={actionState} name="username" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">邮箱</Label>
					<Input
						id="email"
						name="email"
						type="email"
						defaultValue={user.email}
						placeholder="email@example.com"
					/>
					<FieldError actionState={actionState} name="email" />
				</div>
				<SubmitButton label="保存" />
			</div>
		</Form>
	);
};

export { ProfileForm };
