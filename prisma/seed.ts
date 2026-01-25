import "dotenv/config";

import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

const users = [
	{
		username: "admin",
		email: "2829791064@qq.com",
	},
	{
		username: "user",
		email: "hello@vdigital.design",
	},
];
const spaces = [
	{
		name: "空间1",
		description: "空间1描述",
	},
];
const rootAssets = [
	{ name: "物体1", description: "物体1描述", orderIndex: 0 },
];
const containers = [
	{ name: "容器1", description: "容器1描述", orderIndex: 0 },
];
const containerAssets = [
	{ name: "物体2", description: "物体2描述", orderIndex: 0 },
];

const seed = async () => {
	const t0 = performance.now();
	console.log("DB Seed: Started ...");
	await prisma.spaceItem.deleteMany();
	await prisma.space.deleteMany();
	await prisma.session.deleteMany();
	await prisma.user.deleteMany();
	const passwordHash = await hash("pxs666");
	const user = await prisma.user.createManyAndReturn({
		data: users.map((u) => ({ ...u, passwordHash })),
	});
	const space = await prisma.space.createManyAndReturn({
		data: spaces.map((s) => ({ ...s, userId: user[0].id })),
	});

	await prisma.spaceItem.createMany({
		data: rootAssets.map((a, i) => ({
			...a,
			orderIndex: i,
			spaceId: space[0].id,
			type: "asset",
		})),
	});

	const containerRows = await prisma.spaceItem.createManyAndReturn({
		data: containers.map((c, i) => ({
			...c,
			orderIndex: i,
			spaceId: space[0].id,
			type: "container",
		})),
	});

	await prisma.spaceItem.createMany({
		data: containerAssets.map((a, i) => ({
			...a,
			orderIndex: i,
			spaceId: space[0].id,
			containerId: containerRows[0].id,
			type: "asset",
		})),
	});

	const t1 = performance.now();
	console.log(`DB Seed: Finished (${t1 - t0}ms)`);
};

seed();
