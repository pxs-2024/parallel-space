"use server";

import { hash } from "@node-rs/argon2";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { toActionState } from "@/components/form/utils/to-action-state";

const signUpSchema = z
	.object({
		username: z
			.string()
			.min(1)
			.max(191)
			.refine((value) => !value.includes(" "), "Username cannot contain spaces"),
		email: z.string().min(1, { message: "Is required" }).max(191).email(),
		password: z.string().min(6).max(191),
		confirmPassword: z.string().min(6).max(191),
	})
	.superRefine(({ password, confirmPassword }, ctx) => {
		if (password !== confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "Passwords do not match",
				path: ["confirmPassword"],
			});
		}
	});

export const signUp = async (_actionState: ActionState, formData: FormData) => {
	try {
		const { username, email, password } = signUpSchema.parse(
			Object.fromEntries(formData.entries())
		);

		const passwordHash = await hash(password);
		const user = await prisma.user.create({
			data: {
				username,
				email,
				passwordHash,
			},
		});
		const session = await createSession(user.id);
		await setSessionCookie(session.token);
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			{
				return toActionState("ERROR", "Username or email already exists", formData);
			}
		}
		return fromErrorToActionState(error, formData);
	}
	// todo 成功后跳转用户首页
	redirect("/");
};
