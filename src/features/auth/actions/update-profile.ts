"use server";

import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import {
	ActionState,
	fromErrorToActionState,
	toActionState,
} from "@/components/form/utils/to-action-state";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

const updateProfileSchema = z.object({
	username: z
		.string()
		.min(1, "用户名为必填")
		.max(191)
		.refine((v) => !v.includes(" "), "用户名不能包含空格"),
	email: z.string().min(1, "邮箱为必填").max(191).email("请输入有效邮箱"),
});

export const updateProfile = async (
	_actionState: ActionState,
	formData: FormData
): Promise<ActionState> => {
	const auth = await getAuth();
	if (!auth) {
		return toActionState("ERROR", "请先登录", formData);
	}

	try {
		const data = updateProfileSchema.parse(Object.fromEntries(formData.entries()));

		await prisma.user.update({
			where: { id: auth.user.id },
			data: { username: data.username, email: data.email },
		});

		return toActionState("SUCCESS", "个人资料已更新", formData);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return toActionState("ERROR", "用户名或邮箱已被使用", formData);
		}
		return fromErrorToActionState(error, formData);
	}
};
