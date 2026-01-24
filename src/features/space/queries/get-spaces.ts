"use server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

export const getSpaces = async () => {
	const auth = await getAuth();
	if (!auth) {
		return [];
	}
	const { user } = auth;
	const spaces = await prisma.space.findMany({
		where: {
			userId: user.id,
		},
	});
	return spaces;
};
