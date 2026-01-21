import "dotenv/config";

import { hash } from "@node-rs/argon2";
import {PrismaClient} from "@/generated/prisma/client";

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


const seed = async () => {
	const t0 = performance.now();
	console.log("DB Seed: Started ...");
	await prisma.user.deleteMany();

	const passwordHash = await hash("pxs666");

	await prisma.user.createManyAndReturn({
		data: users.map((user) => ({
			...user,
			passwordHash,
		})),
	});


	const t1 = performance.now();
	console.log(`DB Seed: Finished (${t1 - t0}ms)`);
};

seed();
