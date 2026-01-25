"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";

const createAssetSchema = z.object({
	name: z.string().min(1, "名称不能为空").max(191, "名称不能超过191个字符"),
	description: z.string().max(1000, "描述不能超过1000个字符").optional().default(""),
});

export async function createAsset(
	spaceId: string,
	_actionState: ActionState,
	formData: FormData
): Promise<ActionState> {
	try {
		const { name, description } = createAssetSchema.parse(
			Object.fromEntries(formData.entries())
		);

		// 检查空间是否存在
		const space = await prisma.space.findUnique({
			where: { id: spaceId },
			select: { id: true },
		});

		if (!space) {
			return toActionState("ERROR", "空间不存在", formData);
		}

		// 创建 asset，默认位置在 (0, 0)
		await prisma.asset.create({
			data: {
				name,
				description: description || "",
				spaceId,
				x: 0,
				y: 0,
			},
		});

		return toActionState("SUCCESS", "物品创建成功", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
}
