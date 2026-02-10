"use server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

const DEFAULT_SPACE_NAME = "我的空间";
const DEFAULT_SPACE_DESCRIPTION = "默认空间";

export const getSpaces = async () => {
	const auth = await getAuth();
	if (!auth) {
		return [];
	}
	const { user } = auth;
	let spaces = await prisma.space.findMany({
		where: { userId: user.id },
		orderBy: [{ order: "asc" }, { createdAt: "asc" }],
	});
	if (spaces.length === 0) {
		await prisma.space.create({
			data: {
				name: DEFAULT_SPACE_NAME,
				description: DEFAULT_SPACE_DESCRIPTION,
				userId: user.id,
				order: 0,
				cells: [],
			},
		});
		spaces = await prisma.space.findMany({
			where: { userId: user.id },
			orderBy: [{ order: "asc" }, { createdAt: "asc" }],
		});
	}
	return spaces;
};
