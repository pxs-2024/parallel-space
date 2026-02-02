import type { PendingConfirmAction } from "@/features/todo/queries/get-todo-page-data";

/** 待办项：仅由定时任务生成的 OPEN 待确认项 */
export type DecisionItem = { kind: "pending"; data: PendingConfirmAction };

export function getDecisionItemKey(item: DecisionItem): string {
	return item.data.id;
}

export function getTypeLabel(item: DecisionItem): string {
	return item.data.type === "RESTOCK"
		? "补充"
		: item.data.type === "DISCARD"
			? "待丢弃"
			: "到期";
}
