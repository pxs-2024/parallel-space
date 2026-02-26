"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { AssetKind } from "@/generated/prisma/client";
import { spacesPath } from "@/paths";

const createAssetSchema = z.object({
	name: z.string().min(1, "名称不能为空").max(191, "名称不能超过191个字符"),
	description: z.string().max(1000, "描述不能超过1000个字符").optional().default(""),
	kind: z.nativeEnum(AssetKind).default(AssetKind.STATIC),
	// 消耗型
	quantity: z
		.union([z.coerce.number().int().positive(), z.literal("")])
		.optional()
		.transform((val) => (val === "" ? undefined : val)),
	unit: z
		.string()
		.max(50, "单位不能超过50个字符")
		.optional()
		.transform((val) => (val && val.trim() ? val.trim() : undefined)),
	reorderPoint: z
		.union([z.coerce.number().int().min(0), z.literal("")])
		.optional()
		.transform((val) => (val === "" ? undefined : val)),
	consumeIntervalDays: z
		.union([z.coerce.number().int().min(1), z.literal("")])
		.optional()
		.transform((val) => (val === "" ? undefined : val)),
	consumeAmountPerTime: z
		.union([z.coerce.number().int().min(0), z.literal("")])
		.optional()
		.transform((val) => (val === "" ? undefined : val)),
	// 时间型
	dueAt: z
		.string()
		.optional()
		.transform((val) => (val && val.trim() ? new Date(val) : undefined)),
});

export async function createAsset(
	spaceId: string,
	_actionState: ActionState,
	formData: FormData
): Promise<ActionState> {
	try {
		const data = createAssetSchema.parse(
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

		// 构建创建数据，根据 kind 只包含相关字段
		const assetData: Record<string, unknown> = {
			name: data.name,
			description: data.description || null,
			kind: data.kind,
			spaceId,
		};

		// 静态物品：数量（默认 1）与单位
		if (data.kind === AssetKind.STATIC) {
			assetData.quantity = data.quantity ?? 1;
			if (data.unit) assetData.unit = data.unit;
		}

		// 消耗型字段
		if (data.kind === AssetKind.CONSUMABLE) {
			if (data.quantity !== undefined) assetData.quantity = data.quantity;
			if (data.unit) assetData.unit = data.unit;
			if (data.reorderPoint !== undefined) assetData.reorderPoint = data.reorderPoint;
			if (data.consumeIntervalDays !== undefined) assetData.consumeIntervalDays = data.consumeIntervalDays;
			if (data.consumeAmountPerTime !== undefined) assetData.consumeAmountPerTime = data.consumeAmountPerTime;
		}

		// 时间型字段
		if (data.kind === AssetKind.TEMPORAL) {
			if (data.dueAt) {
				assetData.dueAt = data.dueAt;
				assetData.nextDueAt = data.dueAt;
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await prisma.asset.create({
			data: assetData as any,
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}${spacesPath()}`);

		return toActionState("SUCCESS", "物品创建成功", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
}
