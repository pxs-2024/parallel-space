"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DecisionItem } from "./types";
import { TypeBadge } from "./decision-type-badge";
import { useDecisionCardActions } from "./use-decision-card-actions";
import { DecisionCardActions } from "./decision-card-actions";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 根据当前时间与 dueAt 计算「还有 X 天」或已过（返回 null 表示已过） */
function daysFromNow(dueAt: Date | null): number | null {
	if (!dueAt) return null;
	const now = Date.now();
	const due = new Date(dueAt).getTime();
	const diff = due - now;
	if (diff <= 0) return null;
	return Math.ceil(diff / MS_PER_DAY);
}

export type DecisionCardProps = {
	item: DecisionItem;
	onRemoving?: (key: string) => void;
};

export function DecisionCard({ item, onRemoving }: DecisionCardProps) {
	const a = item.data;
	const { busy, exiting, handleRestock, handlePostpone } = useDecisionCardActions(item, onRemoving);

	const [showPostponePicker, setShowPostponePicker] = useState(false);
	const [postponeDate, setPostponeDate] = useState("");
	const [showRestockInput, setShowRestockInput] = useState(false);
	const [restockAmount, setRestockAmount] = useState("");

	const days = useMemo(() => daysFromNow(a.dueAt), [a.dueAt]);

	const handlePostponeSubmit = useCallback(() => {
		if (!postponeDate.trim()) return;
		handlePostpone(a.id, postponeDate);
		setShowPostponePicker(false);
		setPostponeDate("");
	}, [a.id, postponeDate, handlePostpone]);

	const handleShowPostponePicker = useCallback((show: boolean) => {
		setShowPostponePicker(show);
		if (show && a.dueAt) {
			const d = new Date(a.dueAt);
			setPostponeDate(d.toISOString().slice(0, 10));
		} else if (!show) setPostponeDate("");
	}, [a.dueAt]);

	const handleRestockSubmit = useCallback(() => {
		const n = parseInt(restockAmount, 10);
		if (!Number.isInteger(n) || n < 1) return;
		handleRestock(a.id, n);
		setShowRestockInput(false);
		setRestockAmount("");
	}, [a.id, restockAmount, handleRestock]);

	const handleShowRestockInput = useCallback((show: boolean) => {
		setShowRestockInput(show);
		if (show) setRestockAmount(String(a.reorderPoint ?? 1));
		else setRestockAmount("");
	}, [a.reorderPoint]);

	if (a.assetKind === "CONSUMABLE") {
		const daysText =
			days != null ? `预计还有 ${days} 天用完` : "按预估已用完";
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
						数量已达补货线，{daysText}，是否已补充？
					</div>
					<div className="text-sm text-muted-foreground">
						{a.spaceName} · {a.assetName}
						{a.unit != null && a.unit !== "" && `（${a.unit}）`}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<DecisionCardActions
						item={a}
						busy={busy}
						onRestock={handleRestock}
						onPostpone={handlePostpone}
						showRestockInput={showRestockInput}
						restockAmount={restockAmount}
						onRestockAmountChange={setRestockAmount}
						onRestockSubmit={handleRestockSubmit}
						onRestockCancel={() => {
							setShowRestockInput(false);
							setRestockAmount("");
						}}
						onShowRestockInput={handleShowRestockInput}
						showPostponePicker={false}
						postponeDate=""
						onPostponeDateChange={() => {}}
						onPostponeSubmit={() => {}}
						onPostponeCancel={() => {}}
						onShowPostponePicker={() => {}}
					/>
				</div>
			</article>
		);
	}

	// 时间型
	const daysText = days != null ? `还有 ${days} 天到期` : "已到期";
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
					你的 {a.assetName} {daysText}。是否延期？
				</div>
				<div className="text-sm text-muted-foreground">
					{a.spaceName}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<DecisionCardActions
					item={a}
					busy={busy}
					onRestock={handleRestock}
					onPostpone={handlePostpone}
					showPostponePicker={showPostponePicker && a.assetKind === "TEMPORAL"}
					postponeDate={postponeDate}
					onPostponeDateChange={setPostponeDate}
					onPostponeSubmit={handlePostponeSubmit}
					onPostponeCancel={() => {
						setShowPostponePicker(false);
						setPostponeDate("");
					}}
					onShowPostponePicker={handleShowPostponePicker}
				/>
			</div>
		</article>
	);
}
