import type { SpaceType } from "./catalog";
import {
  prepareRecommendationData,
  getMissingItemsForSpace,
  rankPriority,
  type Priority,
  type SpaceMissingItem as PrepareSpaceMissingItem,
} from "./prepare";

export type { Priority };
export type SpaceMissingItem = PrepareSpaceMissingItem;

export type OverallItem = {
  key: string;
  name: string;
  recommendedQty: number;
  haveQty: number;
  needQty: number;
  priority: Priority;
  usedInSpaceTypes: SpaceType[];
};

export type UserRecommendationsResult = {
  overallMissing: OverallItem[];
  spaces: Array<{
    spaceId: string;
    spaceName: string;
    inferredSpaceType: SpaceType;
    catalogDisplayName: string;
    missingItems: SpaceMissingItem[];
  }>;
  debug: {
    spaceCount: number;
    assetCount: number;
    uniqueNameCount: number;
    unknownAssetCount: number;
    unknownAssetsSample: Array<{ id: string; name: string; spaceId: string }>;
  };
};

/**
 * 全用户（所有空间）生活物品推荐差集
 */
export async function getRecommendationsForUser(): Promise<UserRecommendationsResult> {
  const { validSpaceMeta, haveByKey } = await prepareRecommendationData();

  const recommendedByKey: Record<string, number> = {};
  const usedInSpaceTypesByKey: Record<string, SpaceType[]> = {};
  for (const sm of validSpaceMeta) {
    const catalog = sm.catalog;
    for (const it of catalog.items) {
      const prev = recommendedByKey[it.key] ?? 0;
      recommendedByKey[it.key] = Math.max(prev, it.recommendedQty);
      usedInSpaceTypesByKey[it.key] = Array.from(
        new Set([...(usedInSpaceTypesByKey[it.key] ?? []), catalog.spaceType])
      );
    }
  }

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

  const spaces = validSpaceMeta.map(sm => {
    const missingItems = getMissingItemsForSpace(sm, haveByKey);
    return {
      spaceId: sm.spaceId,
      spaceName: sm.spaceName,
      inferredSpaceType: sm.inferredSpaceType,
      catalogDisplayName: sm.catalog.displayName,
      missingItems,
    };
  });

  return {
    overallMissing,
    spaces,
    debug: {
      spaceCount: validSpaceMeta.length,
      assetCount: 0,
      uniqueNameCount: 0,
      unknownAssetCount: 0,
      unknownAssetsSample: [],
    },
  };
}

export async function POST() {
  const data = await getRecommendationsForUser();
  return Response.json(data);
}