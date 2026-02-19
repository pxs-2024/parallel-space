import type {
	PendingRestockItem,
	PendingNewAssetItem,
} from "@/features/todo/queries/get-todo-page-data";

/** 待办项：RESTOCK（补充/延期）或 NEW_ASSET（新增物品，应购买） */
export type DecisionItem =
	| { kind: "pending"; data: PendingRestockItem }
	| { kind: "newAsset"; data: PendingNewAssetItem };

export function getDecisionItemKey(item: DecisionItem): string {
	return item.data.id;
}

export function getTypeLabel(item: DecisionItem): string {
	if (item.kind === "newAsset") return "待买";
	return item.data.assetKind === "CONSUMABLE" ? "补充" : "延期";
}

export function getItemCreatedAt(item: DecisionItem): Date {
	return item.data.createdAt;
}
