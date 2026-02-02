"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { DecisionItem } from "./types";
import { TypeBadge } from "./decision-type-badge";
import { useDecisionCardActions } from "./use-decision-card-actions";
import { DecisionCardActions } from "./decision-card-actions";

export type DecisionCardProps = {
	item: DecisionItem;
	onRemoving?: (key: string) => void;
};

export function DecisionCard({ item, onRemoving }: DecisionCardProps) {
	const a = item.data;
	const { busy, exiting, handleSnooze, handleComplete } = useDecisionCardActions(
		item,
		onRemoving
	);

	const [showRestockInput, setShowRestockInput] = useState(false);
	const [restockAmount, setRestockAmount] = useState("");
	const [showRemindDateInput, setShowRemindDateInput] = useState(false);
	const [remindDueDate, setRemindDueDate] = useState("");

	const handleRestockSubmit = useCallback(() => {
		const n = parseInt(restockAmount, 10);
		if (!Number.isInteger(n) || n < 0) return;
		handleComplete(a.id, n);
	}, [restockAmount, handleComplete, a.id]);

	const handleRestockCancel = useCallback(() => {
		setShowRestockInput(false);
		setRestockAmount("");
	}, []);

	const handleRemindSubmit = useCallback(() => {
		if (!remindDueDate.trim()) return;
		handleComplete(a.id, undefined, remindDueDate);
		setShowRemindDateInput(false);
		setRemindDueDate("");
	}, [remindDueDate, handleComplete, a.id]);

	const handleRemindCancel = useCallback(() => {
		setShowRemindDateInput(false);
		setRemindDueDate("");
	}, []);

	// 问句主文案：您的 xxx 已 xxx，是否 xxx？
	const questionMain =
		a.type === "RESTOCK"
			? `您的 ${a.assetName} 已需补货，是否补充？`
			: a.type === "DISCARD"
				? `您的 ${a.assetName} 待丢弃，是否丢弃？`
				: `您的 ${a.assetName} 已到期，是否更新？`;

	return (
		<article
			className={cn(
				"flex w-full flex-row flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition-all duration-300 ease-out",
				exiting && "pointer-events-none scale-[0.98] opacity-0"
			)}
		>
			<TypeBadge item={item} />
			<div className="min-w-0 flex-1 shrink-0 basis-0">
				<div className="font-medium text-foreground">
					{questionMain}
				</div>
				<div className="text-sm text-muted-foreground">
					{a.spaceName}
					{a.dueAt && ` · ${a.dueAt.toLocaleDateString("zh-CN")}`}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<DecisionCardActions
					action={a}
					busy={busy}
					onComplete={handleComplete}
					onSnooze={handleSnooze}
					showRestockInput={showRestockInput && a.type === "RESTOCK"}
					restockAmount={restockAmount}
					onRestockAmountChange={setRestockAmount}
					onRestockSubmit={handleRestockSubmit}
					onRestockCancel={handleRestockCancel}
					onShowRestockInput={setShowRestockInput}
					showRemindDateInput={showRemindDateInput && a.type === "REMIND"}
					remindDueDate={remindDueDate}
					onRemindDueDateChange={setRemindDueDate}
					onRemindSubmit={handleRemindSubmit}
					onRemindCancel={handleRemindCancel}
					onShowRemindDateInput={(show) => {
						setShowRemindDateInput(show);
						if (show && a.dueAt) {
							const d = new Date(a.dueAt);
							setRemindDueDate(d.toISOString().slice(0, 10));
						} else if (!show) setRemindDueDate("");
					}}
				/>
			</div>
		</article>
	);
}
