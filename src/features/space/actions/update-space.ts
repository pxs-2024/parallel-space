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

const cellSchema = z.object({ x: z.number().int(), y: z.number().int() });
const updateSpaceSchema = z.object({
	spaceId: z.string().min(1, "空间 ID 不能为空"),
	name: z.string().min(1, "名称不能为空").max(191, "名称不能超过191个字符").optional(),
	description: z.string().max(1000, "描述不能超过1000个字符").optional(),
	cells: z.array(cellSchema).optional(),
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

		const updateData: { name?: string; description?: string; cells?: { x: number; y: number }[] } = {};
		if (data.name !== undefined) {
			const trimmedName = data.name.trim();
			const duplicate = await prisma.space.findFirst({
				where: {
					userId: auth.user.id,
					name: trimmedName,
					id: { not: data.spaceId },
				},
			});
			if (duplicate) {
				return toActionState("ERROR", "空间名称不能与其他空间重复", formData);
			}
			updateData.name = trimmedName;
		}
		if (data.description !== undefined) updateData.description = data.description.trim();
		if (data.cells !== undefined) updateData.cells = data.cells;

		await prisma.space.update({
			where: { id: data.spaceId },
			data: updateData,
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);

		return toActionState("SUCCESS", "空间已更新", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
}
