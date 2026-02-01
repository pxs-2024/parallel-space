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

const updateSpaceSchema = z.object({
	spaceId: z.string().min(1, "空间 ID 不能为空"),
	name: z.string().min(1, "名称不能为空").max(191, "名称不能超过191个字符"),
	description: z.string().max(1000, "描述不能超过1000个字符").optional().default(""),
});

export async function updateSpace(
	_actionState: ActionState,
	formData: FormData
): Promise<ActionState> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) {
			return toActionState("ERROR", "请先登录", formData);
		}

		const data = updateSpaceSchema.parse(Object.fromEntries(formData.entries()));

		const space = await prisma.space.findFirst({
			where: { id: data.spaceId, userId: auth.user.id },
		});
		if (!space) {
			return toActionState("ERROR", "空间不存在或无权修改", formData);
		}

		await prisma.space.update({
			where: { id: data.spaceId },
			data: {
				name: data.name.trim(),
				description: (data.description ?? "").trim(),
			},
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);
		revalidatePath(`/${locale}/spaces/${data.spaceId}`);

		return toActionState("SUCCESS", "空间已更新", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
}
