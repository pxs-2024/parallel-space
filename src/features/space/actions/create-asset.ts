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
	// 位置
	x: z
		.union([z.coerce.number(), z.literal("")])
		.optional()
		.transform((val) => (val === "" ? undefined : val)),
	y: z
		.union([z.coerce.number(), z.literal("")])
		.optional()
		.transform((val) => (val === "" ? undefined : val)),
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
	// 虚拟型
	refUrl: z
		.string()
		.optional()
		.transform((val) => (val && val.trim() ? val.trim() : undefined))
		.refine(
			(val) => {
				if (!val) return true;
				try {
					new URL(val);
					return true;
				} catch {
					return false;
				}
			},
			{ message: "请输入有效的URL" }
		),
	expiresAt: z
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
			x: data.x ?? null,
			y: data.y ?? null,
			width: 160,
			height: 160,
		};

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

		// 虚拟型字段
		if (data.kind === AssetKind.VIRTUAL) {
			if (data.refUrl) assetData.refUrl = data.refUrl;
			if (data.expiresAt) assetData.expiresAt = data.expiresAt;
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
