import type { PendingRestockItem } from "@/features/todo/queries/get-todo-page-data";

/** 待办项：仅 OPEN 的 RESTOCK（消耗型/时间型） */
export type DecisionItem = { kind: "pending"; data: PendingRestockItem };

export function getDecisionItemKey(item: DecisionItem): string {
	return item.data.id;
}

export function getTypeLabel(item: DecisionItem): string {
	return item.data.assetKind === "CONSUMABLE" ? "补充" : "延期";
}
