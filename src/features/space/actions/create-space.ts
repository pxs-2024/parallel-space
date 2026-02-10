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
const createSpaceSchema = z.object({
	name: z.string().min(1, "名称不能为空").max(191, "名称不能超过191个字符"),
	description: z.string().max(1000, "描述不能超过1000个字符").optional().default(""),
	cells: z.array(cellSchema).optional(),
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

		const maxOrder = await prisma.space
			.aggregate({
				where: { userId: auth.user.id },
				_max: { order: true },
			})
			.then((r) => r._max.order ?? -1);

		await prisma.space.create({
			data: {
				name: data.name.trim(),
				description: (data.description ?? "").trim(),
				userId: auth.user.id,
				order: maxOrder + 1,
				cells: data.cells?.length ? (data.cells as { x: number; y: number }[]) : [],
			},
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);

		return toActionState("SUCCESS", "空间创建成功", formData);
	} catch (error) {
		return fromErrorToActionState(error, formData);
	}
}

/** 从平面图圈选创建空间（直接传参，供 canvas 调用） */
export async function createSpaceFromFloorPlan(
	name: string,
	cells: { x: number; y: number }[]
): Promise<{ ok: true; spaceId: string } | { ok: false; error: string }> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) return { ok: false, error: "请先登录" };
		if (!name?.trim()) return { ok: false, error: "名称不能为空" };
		if (!cells?.length) return { ok: false, error: "请先圈选区域" };

		const maxOrder = await prisma.space
			.aggregate({
				where: { userId: auth.user.id },
				_max: { order: true },
			})
			.then((r) => r._max.order ?? -1);

		const space = await prisma.space.create({
			data: {
				name: name.trim(),
				description: "",
				userId: auth.user.id,
				order: maxOrder + 1,
				cells: cells,
			},
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);
		return { ok: true, spaceId: space.id };
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : "创建失败",
		};
	}
}
