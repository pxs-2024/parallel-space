import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

export type AssetWithSpace = {
  id: string;
  name: string;
  spaceId: string;
  spaceName: string;
  kind: string;
  quantity: number | null;
  unit: string | null;
  reorderPoint: number | null;
  nextDueAt: Date | null;
  expiresAt: Date | null;
};

/** 当前用户所有 space 下的未删除 asset（用于决策页按规则生成建议） */
export const getAllAssetsForDecisions = async (): Promise<AssetWithSpace[]> => {
  const auth = await getAuth();
  if (!auth) return [];

  const spaces = await prisma.space.findMany({
    where: { userId: auth.user.id },
    select: {
      id: true,
      name: true,
      assets: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          spaceId: true,
          kind: true,
          quantity: true,
          unit: true,
          reorderPoint: true,
          nextDueAt: true,
          expiresAt: true,
        },
      },
    },
  });

  return spaces.flatMap((s) =>
    s.assets.map((a) => ({
      ...a,
      spaceName: s.name,
    }))
  );
};

/** 当前用户各 space 下已存在的 OPEN 行为 (assetId, type)，用于决策页去重 */
export const getOpenActionKeysForDecisions = async (): Promise<Set<string>> => {
  const auth = await getAuth();
  if (!auth) return new Set();

  const actions = await prisma.action.findMany({
    where: {
      space: { userId: auth.user.id },
      status: "OPEN",
    },
    select: { assetId: true, type: true },
  });

  return new Set(
    actions.filter((a) => a.assetId).map((a) => `${a.assetId!}:${a.type}`)
  );
};

export type PendingConfirmAction = {
  id: string;
  type: "RESTOCK" | "REMIND" | "DISCARD";
  spaceId: string;
  spaceName: string;
  assetId: string;
  assetName: string;
  unit: string | null;
  dueAt: Date | null;
};

/** 当前用户待确认的 OPEN RESTOCK/REMIND/DISCARD（需用户选择补充/完成或忽略） */
export const getPendingConfirmActions = async (): Promise<
  PendingConfirmAction[]
> => {
  const auth = await getAuth();
  if (!auth) return [];

  const actions = await prisma.action.findMany({
    where: {
      space: { userId: auth.user.id },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND", "DISCARD"] },
      assetId: { not: null },
    },
    include: {
      space: { select: { name: true } },
      asset: { select: { name: true, unit: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  return actions
    .filter((a) => a.asset)
    .map((a) => ({
      id: a.id,
      type: a.type as "RESTOCK" | "REMIND" | "DISCARD",
      spaceId: a.spaceId,
      spaceName: a.space.name,
      assetId: a.assetId!,
      assetName: a.asset!.name,
      unit: a.asset!.unit ?? null,
      dueAt: a.dueAt,
    }));
};

export type DecisionsPageData = {
  assets: AssetWithSpace[];
  openKeys: Set<string>;
  pending: PendingConfirmAction[];
};

/**
 * 决策页一次性拉取：1 次 getAuth + 2 次 Prisma 查询，在内存中派生 openKeys 与 pending。
 * 替代分别调用 getAllAssetsForDecisions / getOpenActionKeysForDecisions / getPendingConfirmActions。
 */
export const getDecisionsPageData = async (
  auth: Awaited<ReturnType<typeof getAuth>>
): Promise<DecisionsPageData> => {
  if (!auth) {
    return { assets: [], openKeys: new Set(), pending: [] };
  }
  const userId = auth.user.id;

  const [spacesWithAssets, openActions] = await Promise.all([
    prisma.space.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        assets: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            spaceId: true,
            kind: true,
            quantity: true,
            unit: true,
            reorderPoint: true,
            nextDueAt: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.action.findMany({
      where: {
        space: { userId },
        status: "OPEN",
        assetId: { not: null },
      },
      include: {
        space: { select: { name: true } },
        asset: { select: { name: true, unit: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  const assets: AssetWithSpace[] = spacesWithAssets.flatMap((s) =>
    s.assets.map((a) => ({ ...a, spaceName: s.name }))
  );

  const openKeys = new Set(
    openActions
      .filter((a) => a.assetId)
      .map((a) => `${a.assetId!}:${a.type}`)
  );

  const pending: PendingConfirmAction[] = openActions
    .filter(
      (a) =>
        a.asset &&
        (a.type === "RESTOCK" || a.type === "REMIND" || a.type === "DISCARD")
    )
    .map((a) => ({
      id: a.id,
      type: a.type as "RESTOCK" | "REMIND" | "DISCARD",
      spaceId: a.spaceId,
      spaceName: a.space.name,
      assetId: a.assetId!,
      assetName: a.asset!.name,
      unit: a.asset!.unit ?? null,
      dueAt: a.dueAt,
    }));

  return { assets, openKeys, pending };
};
