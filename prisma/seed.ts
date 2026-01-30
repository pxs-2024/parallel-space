import "dotenv/config";

import { hash } from "@node-rs/argon2";
import {
	PrismaClient,
	AssetKind,
	AssetState,
	ActionType,
	ActionStatus,
} from "@/generated/prisma/client";

const prisma = new PrismaClient();

const users = [
	{ username: "admin", email: "2829791064@qq.com" },
	{ username: "user", email: "hello@vdigital.design" },
];

const spaces = [
	{ name: "空间1", description: "空间1描述" },
	{ name: "书房", description: "书房物品" },
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
	{
		name: "笔记本",
		description: "消耗型",
		kind: AssetKind.CONSUMABLE,
		state: AssetState.PENDING_RESTOCK,
		quantity: 2,
		unit: "本",
		reorderPoint: 5,
		x: 100,
		y: 100,
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
	const [admin] = await prisma.user.createManyAndReturn({
		data: users.map((u) => ({ ...u, passwordHash })),
	});
	const createdSpaces = await prisma.space.createManyAndReturn({
		data: spaces.map((s) => ({ ...s, userId: admin.id })),
	});
	const space1 = createdSpaces[0];
	const space2 = createdSpaces[1];

	await prisma.asset.createMany({
		data: [
			...assets.map((a) => ({ ...a, spaceId: space1.id, isDeleted: false })),
			{
				name: "书",
				description: "书房书籍",
				kind: AssetKind.STATIC,
				state: AssetState.ACTIVE,
				spaceId: space2.id,
				isDeleted: false,
				x: 0,
				y: 0,
			},
		],
	});

	const space1Assets = await prisma.asset.findMany({
		where: { spaceId: space1.id },
		select: { id: true, name: true },
	});
	const space2Assets = await prisma.asset.findMany({
		where: { spaceId: space2.id },
		select: { id: true, name: true },
	});

	const baseTime = new Date();
	const actionData = [
		{
			spaceId: space1.id,
			assetId: space1Assets[0]?.id ?? null,
			type: ActionType.AUTO_CONSUME,
			status: ActionStatus.DONE,
			createdAt: new Date(baseTime.getTime() - 3 * 60 * 60 * 1000),
		},
		{
			spaceId: space1.id,
			assetId: space1Assets[1]?.id ?? null,
			type: ActionType.RESTOCK,
			status: ActionStatus.DONE,
			createdAt: new Date(baseTime.getTime() - 2 * 60 * 60 * 1000),
		},
		{
			spaceId: space1.id,
			assetId: space1Assets[2]?.id ?? null,
			type: ActionType.REMIND,
			status: ActionStatus.SKIPPED,
			createdAt: new Date(baseTime.getTime() - 1 * 60 * 60 * 1000),
		},
		{
			spaceId: space2.id,
			assetId: space2Assets[0]?.id ?? null,
			type: ActionType.REMIND,
			status: ActionStatus.DONE,
			createdAt: new Date(baseTime.getTime() - 30 * 60 * 1000),
		},
		{
			spaceId: space1.id,
			assetId: space1Assets[0]?.id ?? null,
			type: ActionType.DISCARD,
			status: ActionStatus.DISCARDED,
			createdAt: new Date(baseTime.getTime() - 15 * 60 * 1000),
		},
	];

	await prisma.action.createMany({
		data: actionData.map((a) => ({
			...a,
			updatedAt: a.createdAt,
		})),
	});

	const t1 = performance.now();
	console.log(`DB Seed: Finished (${t1 - t0}ms)`);
};

seed();
