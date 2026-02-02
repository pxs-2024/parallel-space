import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processConsumablesAndGenerateActionsForUser } from "@/features/todo/actions/process-consumables-and-generate-actions";

/**
 * Vercel Cron 每日 24 点调用：为所有用户执行消耗型资产处理与决策动作生成。
 * 需在 Vercel 环境变量中配置 CRON_SECRET，请求头需为 Authorization: Bearer <CRON_SECRET>。
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true },
  });

  const errors: string[] = [];
  for (const user of users) {
    try {
      await processConsumablesAndGenerateActionsForUser(user.id);
    } catch (e) {
      errors.push(`${user.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: users.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
