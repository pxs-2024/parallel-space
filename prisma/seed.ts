import "dotenv/config";

import { hash } from "@node-rs/argon2";
import { PrismaClient, AssetKind, AssetState } from "@/generated/prisma/client";

const prisma = new PrismaClient();

const users = [
	{
		username: "admin",
		email: "2829791064@qq.com",
	},
	{
		username: "user",
		// use your own email here
		email: "hello@vdigital.design",
	},
];
const spaces = [
	{
		name: "空间1",
		description: "空间1描述",
	},
];
const assets = [
	{
		name: "物体1",
		description: "物体1描述",
		kind: AssetKind.STATIC,
		state: AssetState.ACTIVE,
		x: 300,
		y: 300,
	},
	{
		name: "物体2",
		description: "物体2描述",
		kind: AssetKind.CONSUMABLE,
		state: AssetState.ACTIVE,
		quantity: 10,
		unit: "个",
		reorderPoint: 5,
		consumeIntervalDays: 7,
		consumeAmountPerTime: 2,
		x: 500,
		y: 500,
	},
];

const seed = async () => {
	const t0 = performance.now();
	console.log("DB Seed: Started ...");
	await prisma.action.deleteMany();
	await prisma.asset.deleteMany();
	await prisma.space.deleteMany();
	await prisma.session.deleteMany();
	await prisma.user.deleteMany();
	const passwordHash = await hash("pxs666");
	const user = await prisma.user.createManyAndReturn({
		data: users.map((user) => ({
			...user,
			passwordHash,
		})),
	});
	const space = await prisma.space.createManyAndReturn({
		data: spaces.map((space) => ({
			...space,
			userId: user[0].id,
		})),
	});
	await prisma.asset.createMany({
		data: assets.map((asset) => ({
			...asset,
			spaceId: space[0].id,
			isDeleted: false,
		})),
	});

	const t1 = performance.now();
	console.log(`DB Seed: Finished (${t1 - t0}ms)`);
};

seed();
