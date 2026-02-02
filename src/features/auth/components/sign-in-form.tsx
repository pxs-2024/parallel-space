"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/form/field-error";
import { Form } from "@/components/form/form";
import { SubmitButton } from "@/components/form/submit-button";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { Input } from "@/components/ui/input";
import { signIn } from "../actions/sign-in";
import { useTranslations } from "next-intl";

const SignInForm = () => {
	const [actionState, action] = useActionState(signIn, EMPTY_ACTION_STATE);
	const t = useTranslations("auth");

	return (
		<Form action={action} actionState={actionState}>
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

			<SubmitButton label={t("signIn")} />
		</Form>
	);
};

export { SignInForm };
