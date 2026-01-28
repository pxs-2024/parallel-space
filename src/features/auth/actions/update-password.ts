"use server";

import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import {
	ActionState,
	fromErrorToActionState,
	toActionState,
} from "@/components/form/utils/to-action-state";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "请输入当前密码"),
		newPassword: z.string().min(6, "新密码至少 6 位").max(191),
		confirmPassword: z.string().min(1, "请确认新密码"),
	})
	.superRefine(({ newPassword, confirmPassword }, ctx) => {
		if (newPassword !== confirmPassword) {
			ctx.addIssue({
				code: "custom",
				message: "两次输入的新密码不一致",
				path: ["confirmPassword"],
			});
		}
	});

export const updatePassword = async (
	_actionState: ActionState,
	formData: FormData
): Promise<ActionState> => {
	const auth = await getAuth();
	if (!auth) {
		return toActionState("ERROR", "请先登录", formData);
	}

	try {
		const { currentPassword, newPassword } = updatePasswordSchema.parse(
			Object.fromEntries(formData.entries())
		);

		const user = await prisma.user.findUnique({
			where: { id: auth.user.id },
			select: { passwordHash: true },
		});
		if (!user) {
			return toActionState("ERROR", "用户不存在", formData);
		}

		const valid = await verify(user.passwordHash, currentPassword);
		if (!valid) {
			return toActionState("ERROR", "当前密码错误", formData);
		}

		const passwordHash = await hash(newPassword);
		await prisma.user.update({
			where: { id: auth.user.id },
			data: { passwordHash },
		});

		return toActionState("SUCCESS", "密码已修改", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
};
