"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import {
	ActionState,
	toActionState,
	fromErrorToActionState,
} from "@/components/form/utils/to-action-state";
import { getAuth } from "@/features/auth/queries/get-auth";

const createSpaceSchema = z.object({
	name: z.string().min(1, "名称不能为空").max(191, "名称不能超过191个字符"),
	description: z.string().max(1000, "描述不能超过1000个字符").optional().default(""),
});

export async function createSpace(
	_actionState: ActionState,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) {
			return toActionState("ERROR", "请先登录", formData);
		}

		const data = createSpaceSchema.parse(Object.fromEntries(formData.entries()));

		await prisma.space.create({
			data: {
				name: data.name.trim(),
				description: (data.description ?? "").trim(),
				userId: auth.user.id,
			},
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);

		return toActionState("SUCCESS", "空间创建成功", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
}
