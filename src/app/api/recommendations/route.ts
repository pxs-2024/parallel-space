import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getAuth } from "@/features/auth/queries/get-auth";
import { SPACE_CATALOG, type SpaceType, type SpaceCatalogItem } from "./catalog";

type AssetLite = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  dueAt: Date | null;
  kind: string;
  spaceId: string;
};

type SpaceLite = {
  id: string;
  name: string;
};

export type Priority = "P0" | "P1" | "P2";

export type OverallItem = {
  key: string;
  name: string;
  recommendedQty: number;
  haveQty: number;
  needQty: number;
  priority: Priority;
  // 这个物品属于哪些空间类型（用于 UI 提示/定位）
  usedInSpaceTypes: SpaceType[];
};

export type SpaceMissingItem = SpaceCatalogItem & {
  haveQty: number;
  needQty: number;
};

export type UserRecommendationsResult = {
  overallMissing: OverallItem[]; // 全局差集（去重）
  spaces: Array<{
    spaceId: string;
    spaceName: string;
    inferredSpaceType: SpaceType;
    catalogDisplayName: string;
    missingItems: SpaceMissingItem[]; // 按空间缺口（不去重）
  }>;
  debug: {
    spaceCount: number;
    assetCount: number;
    uniqueNameCount: number;
    unknownAssetCount: number;
    unknownAssetsSample: Array<{ id: string; name: string; spaceId: string }>;
  };
};

function inferSpaceType(spaceName: string): SpaceType {
  const s = spaceName.toLowerCase();
  const has = (...words: string[]) => words.some(w => s.includes(w));

  if (has("entry", "hall", "foyer", "玄关", "入口", "门口")) return "ENTRYWAY";
  if (has("living", "客厅", "起居")) return "LIVING_ROOM";
  if (has("kitchen", "厨房")) return "KITCHEN";
  if (has("dining", "餐厅", "饭厅")) return "DINING";
  if (has("bedroom", "主卧", "次卧", "卧室")) return "BEDROOM";
  if (has("bath", "toilet", "卫生间", "洗手间", "浴室")) return "BATHROOM";
  if (has("work", "office", "书房", "工作区")) return "WORKSPACE";
  if (has("medical", "药", "医", "医疗")) return "MEDICAL";
  if (has("tool", "工具")) return "TOOLS";
  if (has("clean", "清洁")) return "CLEANING";
  if (has("storage", "储物", "收纳", "杂物")) return "STORAGE";
  if (has("digital", "数码", "设备", "网", "路由")) return "DIGITAL";

  return "STORAGE";
}

const rankPriority = (p: string) => (p === "P0" ? 0 : p === "P1" ? 1 : 2);

/**
 * 全用户（所有空间）生活物品推荐差集
 * - overallMissing：按 itemKey 去重后的全局缺口（推荐量合并策略：max）
 * - spaces[].missingItems：按空间的缺口（不去重）
 */
export async function getRecommendationsForUser(): Promise<UserRecommendationsResult> {
  // 1) auth
  const session = await getAuth();
  if (!session) throw new Error("Unauthorized");
  const userId = session.userId;

  // 2) load spaces
  const spaces: SpaceLite[] = await prisma.space.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  // 3) load all assets across all spaces
  const assets: AssetLite[] = await prisma.asset.findMany({
    where: { isDeleted: false, space: { userId } },
    select: { id: true, name: true, quantity: true, unit: true, dueAt: true, kind: true, spaceId: true },
  });

  // 4) 生成“用户推荐库”（按用户现有空间推断 spaceType）
  const spaceMeta = spaces.map(s => {
    const inferredSpaceType = inferSpaceType(s.name);
    const catalog = SPACE_CATALOG.find(c => c.spaceType === inferredSpaceType);
    return {
      spaceId: s.id,
      spaceName: s.name,
      inferredSpaceType,
      catalog,
    };
  });

  // 如果某空间推断不到 catalog，就给空（不报错）
  // 你也可以选择：catalog 为空就跳过推荐
  const validSpaceMeta = spaceMeta.filter(x => x.catalog);

  // 5) 构建“全局 canonical items 列表”（用于 OpenAI 映射）
  //    注意：同 key 可能在多个空间出现，合并 usedInSpaceTypes
  const itemByKey = new Map<string, { key: string; name: string; priority: Priority; usedInSpaceTypes: SpaceType[] }>();

  for (const sm of validSpaceMeta) {
    const catalog = sm.catalog!;
    for (const it of catalog.items) {
      const existing = itemByKey.get(it.key);
      if (!existing) {
        itemByKey.set(it.key, {
          key: it.key,
          name: it.name,
          priority: it.priority,
          usedInSpaceTypes: [catalog.spaceType],
        });
      } else {
        if (!existing.usedInSpaceTypes.includes(catalog.spaceType)) {
          existing.usedInSpaceTypes.push(catalog.spaceType);
        }
        // 优先级取更高（P0 > P1 > P2）
        if (rankPriority(it.priority) < rankPriority(existing.priority)) {
          existing.priority = it.priority;
        }
      }
    }
  }

  const globalCatalogItems = Array.from(itemByKey.values());

  // 6) OpenAI：只传去重后的名称列表（避免超时）
  const uniqueNames = Array.from(
    new Set(assets.map(a => (a.name ?? "").trim()).filter(Boolean))
  ).slice(0, 800);

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You map raw home item names to a provided catalog item key.\n" +
          "Return ONLY valid JSON:\n" +
          '{ "mappings": [ { "rawName": string, "itemKey": string, "confidence": number } ] }\n' +
          "Rules:\n" +
          "- itemKey must be one of provided catalogItems keys, otherwise use 'UNKNOWN'.\n" +
          "- confidence is 0..1.\n" +
          "- No extra text. No extra keys."
      },
      {
        role: "user",
        content: JSON.stringify({
          rawNames: uniqueNames,
          catalogItems: globalCatalogItems.map(i => ({ key: i.key, name: i.name, spaceTypes: i.usedInSpaceTypes })),
        }),
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as {
    mappings: { rawName: string; itemKey: string; confidence: number }[];
  };

  const keySet = new Set(globalCatalogItems.map(i => i.key));
  const mapByName = new Map<string, { itemKey: string; confidence: number }>();
  for (const m of parsed.mappings ?? []) {
    const rawName = (m.rawName ?? "").trim();
    if (!rawName) continue;
    const k = keySet.has(m.itemKey) ? m.itemKey : "UNKNOWN";
    mapByName.set(rawName, { itemKey: k, confidence: typeof m.confidence === "number" ? m.confidence : 0 });
  }

  // 7) 聚合“全用户已有量”（按 itemKey）
  //    - 过期不计（dueAt < now）
  //    - quantity null 默认当 1（更适合静态物品）
  const now = Date.now();
  const haveByKey: Record<string, number> = {};
  const unknownAssets: Array<{ id: string; name: string; spaceId: string }> = [];

  for (const a of assets) {
    const rawName = (a.name ?? "").trim();
    const mapped = mapByName.get(rawName);
    const itemKey = mapped?.itemKey ?? "UNKNOWN";

    if (itemKey === "UNKNOWN") {
      unknownAssets.push({ id: a.id, name: rawName, spaceId: a.spaceId });
      continue;
    }
    if (a.dueAt && a.dueAt.getTime() < now) continue;

    const qty = typeof a.quantity === "number" ? a.quantity : 1;
    haveByKey[itemKey] = (haveByKey[itemKey] ?? 0) + qty;
  }

  // 8) 计算“全局推荐量”（按 key 合并：max，避免多空间重复计数）
  const recommendedByKey: Record<string, number> = {};
  const usedInSpaceTypesByKey: Record<string, SpaceType[]> = {};

  for (const sm of validSpaceMeta) {
    const catalog = sm.catalog!;
    for (const it of catalog.items) {
      const prev = recommendedByKey[it.key] ?? 0;
      recommendedByKey[it.key] = Math.max(prev, it.recommendedQty);
      usedInSpaceTypesByKey[it.key] = Array.from(
        new Set([...(usedInSpaceTypesByKey[it.key] ?? []), catalog.spaceType])
      );
    }
  }

  // 9) overallMissing（全局差集）
  const overallMissing: OverallItem[] = globalCatalogItems
    .map(ci => {
      const recommendedQty = recommendedByKey[ci.key] ?? 0;
      const haveQty = haveByKey[ci.key] ?? 0;
      const needQty = Math.max(recommendedQty - haveQty, 0);

      return {
        key: ci.key,
        name: ci.name,
        recommendedQty,
        haveQty,
        needQty,
        priority: ci.priority,
        usedInSpaceTypes: usedInSpaceTypesByKey[ci.key] ?? ci.usedInSpaceTypes,
      };
    })
    .filter(x => x.needQty > 0)
    .sort((a, b) => {
      const d = rankPriority(a.priority) - rankPriority(b.priority);
      if (d !== 0) return d;
      return b.needQty - a.needQty;
    });

  // 10) 按空间缺口（用于 UI：空间面板）
  const spacesResult = validSpaceMeta.map(sm => {
    const catalog = sm.catalog!;
    const missingItems: SpaceMissingItem[] = catalog.items
      .map(it => {
        const haveQty = haveByKey[it.key] ?? 0; // 全用户库存口径：用全局 have
        const needQty = Math.max(it.recommendedQty - haveQty, 0);
        return { ...it, haveQty, needQty };
      })
      .filter(x => x.needQty > 0)
      .sort((a, b) => {
        const d = rankPriority(a.priority) - rankPriority(b.priority);
        if (d !== 0) return d;
        return b.needQty - a.needQty;
      });

    return {
      spaceId: sm.spaceId,
      spaceName: sm.spaceName,
      inferredSpaceType: sm.inferredSpaceType,
      catalogDisplayName: catalog.displayName,
      missingItems,
    };
  });

  return {
    overallMissing,
    spaces: spacesResult,
    debug: {
      spaceCount: spaces.length,
      assetCount: assets.length,
      uniqueNameCount: uniqueNames.length,
      unknownAssetCount: unknownAssets.length,
      unknownAssetsSample: unknownAssets.slice(0, 20),
    },
  };
}

export async function POST() {
  const data = await getRecommendationsForUser();
  return Response.json(data);
}