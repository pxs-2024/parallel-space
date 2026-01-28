"use client";

import { useActionState } from "react";
import { Form } from "@/components/form/form";
import { FieldError } from "@/components/form/field-error";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { updatePassword } from "../actions/update-password";

const PasswordForm = () => {
	const [actionState, action] = useActionState(updatePassword, EMPTY_ACTION_STATE);

	return (
		<Form action={action} actionState={actionState}>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="currentPassword">当前密码</Label>
					<Input
						id="currentPassword"
						name="currentPassword"
						type="password"
						placeholder="请输入当前密码"
					/>
					<FieldError actionState={actionState} name="currentPassword" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="newPassword">新密码</Label>
					<Input
						id="newPassword"
						name="newPassword"
						type="password"
						placeholder="至少 6 位"
					/>
					<FieldError actionState={actionState} name="newPassword" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="confirmPassword">确认新密码</Label>
					<Input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						placeholder="再次输入新密码"
					/>
					<FieldError actionState={actionState} name="confirmPassword" />
				</div>
				<SubmitButton label="修改密码" />
			</div>
		</Form>
	);
};

export { PasswordForm };
