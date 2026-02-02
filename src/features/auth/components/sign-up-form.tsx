"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/form/field-error";
import { Form } from "@/components/form/form";
import { SubmitButton } from "@/components/form/submit-button";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { Input } from "@/components/ui/input";
import { signUp } from "../actions/action-up";
import { useTranslations } from "next-intl";

const SignUpForm = () => {
	const [actionState, action] = useActionState(signUp, EMPTY_ACTION_STATE);
	const t = useTranslations("auth");

	return (
		<Form action={action} actionState={actionState}>
			<Input
				name="username"
				placeholder={t("username")}
				defaultValue={actionState.payload?.get("username") as string}
			/>
			<FieldError actionState={actionState} name="username" />

			<Input
				name="email"
				placeholder={t("email")}
				defaultValue={actionState.payload?.get("email") as string}
			/>
			<FieldError actionState={actionState} name="email" />

			<Input
				type="password"
				name="password"
				placeholder={t("password")}
				defaultValue={actionState.payload?.get("password") as string}
			/>
			<FieldError actionState={actionState} name="password" />

			<Input
				type="password"
				name="confirmPassword"
				placeholder={t("confirmPassword")}
				defaultValue={actionState.payload?.get("confirmPassword") as string}
			/>
			<FieldError actionState={actionState} name="confirmPassword" />

			<SubmitButton label={t("signUp")} />
		</Form>
	);
};

export { SignUpForm };
