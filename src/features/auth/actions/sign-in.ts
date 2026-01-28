"use server";

import { verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { decisionsPath } from "@/paths";
import {
	ActionState,
	fromErrorToActionState,
	toActionState,
} from "@/components/form/utils/to-action-state";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";

const signInSchema = z.object({
	email: z.string().min(1, { message: "Is required" }).max(191).email(),
	password: z.string().min(6).max(191),
});

export const signIn = async (_actionState: ActionState, formData: FormData) => {
	try {
		const { email, password } = signInSchema.parse(Object.fromEntries(formData.entries()));
		const user = await prisma.user.findUnique({
			where: { email },
		});
		if (!user) {
			return toActionState("ERROR", "Incorrect email or password", formData);
		}
		const validPassword = await verify(user.passwordHash, password);
		if (!validPassword) {
			return toActionState("ERROR", "Incorrect email or password", formData);
		}
		const session = await createSession(user.id);
		await setSessionCookie(session.token);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
	const locale = await getLocale();
	redirect(`/${locale}${decisionsPath()}`);
};
