import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";
import {
  inferSpaceType,
  getRecommendationForOneSpace,
  formatMissingSummary,
  type SpaceMissingItem,
} from "../prepare";
import { SPACE_CATALOG } from "../catalog";

const SSE = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export type StreamEvent =
  | { type: "space_start"; spaceId: string; spaceName: string }
  | { type: "text"; text: string }
  | { type: "data"; spaceId: string; spaceName: string; missingItems: SpaceMissingItem[] }
  | { type: "space_end" }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * 按空间 diff：先只拉空间列表，再逐个空间拉资产、调 AI、算缺口并立即流式输出。
 * 不做全局整合，第一个空间出结果时间大幅提前。
 */
export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(SSE(event, data)));

      try {
        push("text", { text: "正在加载您的空间…" });

        const session = await getAuth();
        if (!session) {
          push("error", { message: "未登录" });
          controller.close();
          return;
        }
        const userId = session.userId;

        const spaces = await prisma.space.findMany({
          where: { userId },
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        });

        push("text", { text: `已加载 ${spaces.length} 个空间，开始逐空间检查。` });

        for (const space of spaces) {
          push("space_start", { spaceId: space.id, spaceName: space.name });
          push("text", { text: `正在检查【${space.name}】的配置…` });

          const assets = await prisma.asset.findMany({
            where: { spaceId: space.id, isDeleted: false },
            select: {
              id: true,
              name: true,
              quantity: true,
              unit: true,
              dueAt: true,
              kind: true,
              spaceId: true,
            },
          });

          const inferredType = inferSpaceType(space.name);
          const catalog = SPACE_CATALOG.find((c) => c.spaceType === inferredType);

          if (!catalog) {
            push("text", { text: "该空间暂无推荐清单。" });
            push("data", { spaceId: space.id, spaceName: space.name, missingItems: [] });
            push("space_end", {});
            continue;
          }

          const missingItems = await getRecommendationForOneSpace(
            space.id,
            space.name,
            assets,
            catalog
          );

          const missingMsg =
            missingItems.length > 0
              ? formatMissingSummary(missingItems)
              : "该空间配置较完善，暂无缺口。";
          push("text", { text: missingMsg });
          push("data", { spaceId: space.id, spaceName: space.name, missingItems });
          push("space_end", {});
        }

        push("done", {});
      } catch (e) {
        const message = e instanceof Error ? e.message : "获取建议失败";
        push("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
