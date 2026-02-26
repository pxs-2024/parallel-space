/**
 * 推荐流式/非流式共用的准备逻辑：鉴权、加载空间与资产、OpenAI 映射、按 key 的已有量。
 * 流式接口按空间迭代时用此结果逐空间计算缺口并推送 SSE。
 */

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getAuth } from "@/features/auth/queries/get-auth";
import { SPACE_CATALOG, type SpaceType, type SpaceCatalogItem } from "./catalog";

type SpaceLite = { id: string; name: string };

export type Priority = "P0" | "P1" | "P2";

export type SpaceMissingItem = SpaceCatalogItem & {
  haveQty: number;
  needQty: number;
};

export type SpaceMetaItem = {
  spaceId: string;
  spaceName: string;
  inferredSpaceType: SpaceType;
  catalog: NonNullable<ReturnType<typeof SPACE_CATALOG.find>>;
};

export function inferSpaceType(spaceName: string): SpaceType {
  const s = spaceName.toLowerCase();
  const has = (...words: string[]) => words.some((w) => s.includes(w));
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

export type SpaceCatalog = (typeof SPACE_CATALOG)[number];

/** 单个空间的资产（用于按空间 diff） */
export type AssetLite = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  dueAt: Date | null;
  kind: string;
  spaceId: string;
};

export const rankPriority = (p: string) => (p === "P0" ? 0 : p === "P1" ? 1 : 2);

export type PreparedRecommendation = {
  validSpaceMeta: SpaceMetaItem[];
  haveByKey: Record<string, number>;
};

export type ProgressCallback = (text: string) => void;

export async function prepareRecommendationData(): Promise<PreparedRecommendation> {
  return prepareRecommendationDataWithProgress(() => {});
}

/** 带进度回调的版本：流式接口在等待期间可推送进度文案，避免长时间白屏 */
export async function prepareRecommendationDataWithProgress(
  onProgress: ProgressCallback
): Promise<PreparedRecommendation> {
  const session = await getAuth();
  if (!session) throw new Error("Unauthorized");
  const userId = session.userId;

  onProgress("正在加载您的空间…");
  const spaces: SpaceLite[] = await prisma.space.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  onProgress(`已加载 ${spaces.length} 个空间，正在加载物品…`);
  const assets: AssetLite[] = await prisma.asset.findMany({
    where: { isDeleted: false, space: { userId } },
    select: { id: true, name: true, quantity: true, unit: true, dueAt: true, kind: true, spaceId: true },
  });

  onProgress(`已加载 ${assets.length} 件物品，正在用 AI 分析物品清单…`);
  const spaceMeta = spaces.map((s) => {
    const inferredSpaceType = inferSpaceType(s.name);
    const catalog = SPACE_CATALOG.find((c) => c.spaceType === inferredSpaceType);
    return { spaceId: s.id, spaceName: s.name, inferredSpaceType, catalog };
  });

  const validSpaceMeta = spaceMeta.filter((x): x is SpaceMetaItem => !!x.catalog) as SpaceMetaItem[];

  const itemByKey = new Map<string, { key: string; name: string; priority: Priority; usedInSpaceTypes: SpaceType[] }>();
  for (const sm of validSpaceMeta) {
    const catalog = sm.catalog;
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
        if (!existing.usedInSpaceTypes.includes(catalog.spaceType)) existing.usedInSpaceTypes.push(catalog.spaceType);
        if (rankPriority(it.priority) < rankPriority(existing.priority)) existing.priority = it.priority;
      }
    }
  }

  const globalCatalogItems = Array.from(itemByKey.values());
  const uniqueNames = Array.from(new Set(assets.map((a) => (a.name ?? "").trim()).filter(Boolean))).slice(0, 800);

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
          "Rules:\n- itemKey must be one of provided catalogItems keys, otherwise use 'UNKNOWN'.\n- confidence is 0..1.\n- No extra text. No extra keys.",
      },
      {
        role: "user",
        content: JSON.stringify({
          rawNames: uniqueNames,
          catalogItems: globalCatalogItems.map((i) => ({ key: i.key, name: i.name, spaceTypes: i.usedInSpaceTypes })),
        }),
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as {
    mappings: { rawName: string; itemKey: string; confidence: number }[];
  };
  const keySet = new Set(globalCatalogItems.map((i) => i.key));
  const mapByName = new Map<string, { itemKey: string; confidence: number }>();
  for (const m of parsed.mappings ?? []) {
    const rawName = (m.rawName ?? "").trim();
    if (!rawName) continue;
    const k = keySet.has(m.itemKey) ? m.itemKey : "UNKNOWN";
    mapByName.set(rawName, { itemKey: k, confidence: typeof m.confidence === "number" ? m.confidence : 0 });
  }

  const now = Date.now();
  const haveByKey: Record<string, number> = {};
  for (const a of assets) {
    const rawName = (a.name ?? "").trim();
    const mapped = mapByName.get(rawName);
    const itemKey = mapped?.itemKey ?? "UNKNOWN";
    if (itemKey === "UNKNOWN") continue;
    if (a.dueAt && a.dueAt.getTime() < now) continue;
    const qty = typeof a.quantity === "number" ? a.quantity : 1;
    haveByKey[itemKey] = (haveByKey[itemKey] ?? 0) + qty;
  }

  return { validSpaceMeta, haveByKey };
}

/** 计算单个空间的缺口列表（用于流式按空间输出） */
export function getMissingItemsForSpace(
  sm: SpaceMetaItem,
  haveByKey: Record<string, number>
): SpaceMissingItem[] {
  const catalog = sm.catalog;
  return catalog.items
    .map((it) => {
      const haveQty = haveByKey[it.key] ?? 0;
      const needQty = Math.max(it.recommendedQty - haveQty, 0);
      return { ...it, haveQty, needQty };
    })
    .filter((x) => x.needQty > 0)
    .sort((a, b) => {
      const d = rankPriority(a.priority) - rankPriority(b.priority);
      if (d !== 0) return d;
      return b.needQty - a.needQty;
    });
}

/** 将缺口列表格式化为一句「您缺少：A x2、B x1。」用于流式展示 */
export function formatMissingSummary(items: SpaceMissingItem[]): string {
  if (items.length === 0) return "";
  const parts = items.map((it) => `${it.name}${it.needQty > 1 ? ` x${it.needQty}` : ""}`);
  return "您缺少：" + parts.join("、") + "。";
}

/**
 * 按空间 diff：只拉该空间资产、只对该空间调 AI、只算该空间缺口。
 * 流式接口按空间循环调用，每空间独立，首空间可尽快出结果。
 */
export async function getRecommendationForOneSpace(
  _spaceId: string,
  _spaceName: string,
  assets: AssetLite[],
  catalog: SpaceCatalog
): Promise<SpaceMissingItem[]> {
  const catalogItems = catalog.items.map((i) => ({
    key: i.key,
    name: i.name,
    priority: i.priority,
    usedInSpaceTypes: [catalog.spaceType] as SpaceType[],
  }));
  const keySet = new Set(catalogItems.map((i) => i.key));
  const uniqueNames = Array.from(
    new Set(assets.map((a) => (a.name ?? "").trim()).filter(Boolean))
  ).slice(0, 500);

  if (uniqueNames.length === 0) {
    return catalog.items
      .map((it) => {
        const haveQty = 0;
        const needQty = it.recommendedQty;
        return { ...it, haveQty, needQty };
      })
      .filter((x) => x.needQty > 0)
      .sort((a, b) => {
        const d = rankPriority(a.priority) - rankPriority(b.priority);
        if (d !== 0) return d;
        return b.needQty - a.needQty;
      });
  }

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
          "Rules:\n- itemKey must be one of provided catalogItems keys, otherwise use 'UNKNOWN'.\n- confidence is 0..1.\n- No extra text. No extra keys.",
      },
      {
        role: "user",
        content: JSON.stringify({
          rawNames: uniqueNames,
          catalogItems: catalogItems.map((i) => ({ key: i.key, name: i.name, spaceTypes: i.usedInSpaceTypes })),
        }),
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as {
    mappings: { rawName: string; itemKey: string; confidence: number }[];
  };
  const mapByName = new Map<string, { itemKey: string; confidence: number }>();
  for (const m of parsed.mappings ?? []) {
    const rawName = (m.rawName ?? "").trim();
    if (!rawName) continue;
    const k = keySet.has(m.itemKey) ? m.itemKey : "UNKNOWN";
    mapByName.set(rawName, { itemKey: k, confidence: typeof m.confidence === "number" ? m.confidence : 0 });
  }

  /** 先按 catalog 展示名精确匹配，再回退到 AI 映射，避免「已放对应物品仍被推荐」 */
  const catalogNameToKey = new Map(catalog.items.map((i) => [i.name, i.key]));

  const now = Date.now();
  const haveByKey: Record<string, number> = {};
  for (const a of assets) {
    const rawName = (a.name ?? "").trim();
    if (!rawName) continue;
    const itemKey =
      catalogNameToKey.get(rawName) ?? mapByName.get(rawName)?.itemKey ?? "UNKNOWN";
    if (itemKey === "UNKNOWN") continue;
    if (a.dueAt && a.dueAt.getTime() < now) continue;
    const qty = typeof a.quantity === "number" ? a.quantity : 1;
    haveByKey[itemKey] = (haveByKey[itemKey] ?? 0) + qty;
  }

  return catalog.items
    .map((it) => {
      const haveQty = haveByKey[it.key] ?? 0;
      const needQty = Math.max(it.recommendedQty - haveQty, 0);
      return { ...it, haveQty, needQty };
    })
    .filter((x) => x.needQty > 0)
    .sort((a, b) => {
      const d = rankPriority(a.priority) - rankPriority(b.priority);
      if (d !== 0) return d;
      return b.needQty - a.needQty;
    });
}
