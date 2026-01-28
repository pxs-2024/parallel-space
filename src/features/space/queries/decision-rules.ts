import type { AssetWithSpace } from "./get-all-assets-for-decisions";

const DUE_SOON_DAYS = 7;

export type SuggestedActionType = "RESTOCK" | "REMIND";

export type SuggestedAction = {
  type: SuggestedActionType;
  spaceId: string;
  spaceName: string;
  assetId: string;
  assetName: string;
  reason: string;
  dueAt?: Date | null;
};

/** 根据资产规则生成建议行为，供用户选择创建 */
export function applyDecisionRules(assets: AssetWithSpace[]): SuggestedAction[] {
  const now = Date.now();
  const soon = DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

  const result: SuggestedAction[] = [];

  for (const a of assets) {
    // CONSUMABLE: 数量 <= 补货点 -> 建议补货
    if (
      a.kind === "CONSUMABLE" &&
      a.quantity != null &&
      a.reorderPoint != null &&
      a.quantity <= a.reorderPoint
    ) {
      result.push({
        type: "RESTOCK",
        spaceId: a.spaceId,
        spaceName: a.spaceName,
        assetId: a.id,
        assetName: a.name,
        reason: `库存 ${a.quantity}${a.unit ? ` ${a.unit}` : ""} 低于补货点 ${a.reorderPoint}${a.unit ? ` ${a.unit}` : ""}`,
      });
    }

    // TEMPORAL: 下次到期日已过或即将到期 -> 建议提醒
    if (a.kind === "TEMPORAL" && a.nextDueAt) {
      const due = a.nextDueAt.getTime();
      if (due <= now || due - now <= soon) {
        result.push({
          type: "REMIND",
          spaceId: a.spaceId,
          spaceName: a.spaceName,
          assetId: a.id,
          assetName: a.name,
          reason: due <= now ? "已到期" : "即将到期",
          dueAt: a.nextDueAt,
        });
      }
    }

    // VIRTUAL: 过期日已过或即将到期 -> 建议提醒
    if (a.kind === "VIRTUAL" && a.expiresAt) {
      const exp = a.expiresAt.getTime();
      if (exp <= now || exp - now <= soon) {
        result.push({
          type: "REMIND",
          spaceId: a.spaceId,
          spaceName: a.spaceName,
          assetId: a.id,
          assetName: a.name,
          reason: exp <= now ? "已过期" : "即将过期",
          dueAt: a.expiresAt,
        });
      }
    }
  }

  return result;
}
