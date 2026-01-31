"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { Package, Clock, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PendingConfirmAction } from "@/features/space/queries/get-all-assets-for-decisions";
import type { SuggestedAction } from "@/features/space/queries/decision-rules";
import {
	snoozeAction,
	completeAction,
	type SnoozeChoice,
} from "@/features/space/actions/respond-to-action";
import { createActionFromSuggestion } from "@/features/space/actions/create-action-from-suggestion";

const SNOOZE_OPTIONS: { choice: SnoozeChoice; label: string }[] = [
	{ choice: "ignore_day", label: "忽略一天" },
	{ choice: "ignore_week", label: "忽略一星期" },
	{ choice: "ignore_month", label: "忽略一个月" },
];

export type DecisionItem =
	| { kind: "pending"; data: PendingConfirmAction }
	| { kind: "suggestion"; data: SuggestedAction };

function getTypeLabel(item: DecisionItem): string {
	if (item.kind === "pending") {
		return item.data.type === "RESTOCK"
			? "补充"
			: item.data.type === "DISCARD"
				? "待丢弃"
				: "到期";
	}
	return item.data.type === "RESTOCK" ? "补充" : "到期";
}

function TypeBadge({ item, className }: { item: DecisionItem; className?: string }) {
	const label = getTypeLabel(item);
	const isRestock =
		(item.kind === "pending" && item.data.type === "RESTOCK") ||
		(item.kind === "suggestion" && item.data.type === "RESTOCK");
	const isDue =
		(item.kind === "pending" && item.data.type === "REMIND") ||
		(item.kind === "suggestion" && item.data.type === "REMIND");
	const isDiscard = item.kind === "pending" && item.data.type === "DISCARD";

	const Icon = isDiscard ? Trash2 : isDue ? Clock : Package;
	const bgClass = isDiscard
		? "bg-destructive/20 text-destructive"
		: isDue
			? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
			: "bg-primary/20 text-primary";

	return (
		<div
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-full",
				bgClass,
				className
			)}
			title={label}
		>
			<Icon className="size-4" />
		</div>
	);
}

export function getDecisionItemKey(item: DecisionItem): string {
	return item.kind === "pending" ? item.data.id : `${item.data.assetId}:${item.data.type}`;
}

type DecisionCardProps = {
	item: DecisionItem;
	onRemoving?: (key: string) => void;
};

export function DecisionCard({ item, onRemoving }: DecisionCardProps) {
	const [busy, setBusy] = React.useState(false);
	const [showRestockInput, setShowRestockInput] = React.useState(false);
	const [restockAmount, setRestockAmount] = React.useState("");
	const [exiting, setExiting] = React.useState(false);
	const router = useRouter();

	const handleSnooze = async (actionId: string, choice: SnoozeChoice) => {
		setBusy(true);
		try {
			const res = await snoozeAction(actionId, choice);
			if (res.ok) {
				setExiting(true);
				onRemoving?.(getDecisionItemKey(item));
				setTimeout(() => router.refresh(), 280);
			}
		} finally {
			setBusy(false);
		}
	};

	const handleCompletePending = async (actionId: string, amount?: number) => {
		setBusy(true);
		try {
			const res = await completeAction(actionId, amount);
			if (res.ok) {
				setExiting(true);
				onRemoving?.(getDecisionItemKey(item));
				setTimeout(() => router.refresh(), 280);
			}
		} finally {
			setBusy(false);
		}
	};

	const handleCreateSuggestion = async (s: SuggestedAction) => {
		setBusy(true);
		try {
			const res = await createActionFromSuggestion({
				spaceId: s.spaceId,
				assetId: s.assetId,
				type: s.type,
				dueAt: s.dueAt ?? undefined,
			});
			if (res.ok) {
				setExiting(true);
				onRemoving?.(getDecisionItemKey(item));
				setTimeout(() => router.refresh(), 280);
			}
		} finally {
			setBusy(false);
		}
	};

	if (item.kind === "pending") {
		const a = item.data;
		const isBusy = busy;
		const showInput = showRestockInput && a.type === "RESTOCK";

		const handleRestockSubmit = () => {
			const n = parseInt(restockAmount, 10);
			if (!Number.isInteger(n) || n < 0) return;
			handleCompletePending(a.id, n);
		};

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
						{a.spaceName} · {a.assetName}
					</div>
					<div className="text-sm text-muted-foreground">
						{a.type === "RESTOCK"
							? "需补货"
							: a.type === "DISCARD"
								? "待丢弃"
								: "需提醒"}
						{a.dueAt && ` · ${a.dueAt.toLocaleDateString()}`}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{a.type === "DISCARD" ? (
						<>
							<Button
								size="sm"
								variant="destructive"
								disabled={isBusy}
								onClick={() => handleCompletePending(a.id)}
							>
								{isBusy ? "处理中…" : "确认丢弃"}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="sm" variant="outline" disabled={isBusy}>
										忽略 <ChevronDown className="ml-1 size-3.5 opacity-70" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{SNOOZE_OPTIONS.map(({ choice, label }) => (
										<DropdownMenuItem
											key={choice}
											disabled={isBusy}
											onSelect={() => handleSnooze(a.id, choice)}
										>
											{label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					) : a.type === "RESTOCK" ? (
						showInput ? (
							<>
								<Input
									type="number"
									min={0}
									placeholder={a.unit ? `数量（${a.unit}）` : "数量"}
									value={restockAmount}
									onChange={(e) => setRestockAmount(e.target.value)}
									className="w-24"
								/>
								<Button
									size="sm"
									disabled={isBusy || !restockAmount.trim()}
									onClick={handleRestockSubmit}
								>
									{isBusy ? "处理中…" : "确定"}
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setShowRestockInput(false);
										setRestockAmount("");
									}}
								>
									取消
								</Button>
							</>
						) : (
							<>
								<Button
									size="sm"
									disabled={isBusy}
									onClick={() => setShowRestockInput(true)}
								>
									补充（填数量）
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="sm" variant="outline" disabled={isBusy}>
											忽略 <ChevronDown className="ml-1 size-3.5 opacity-70" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										{SNOOZE_OPTIONS.map(({ choice, label }) => (
											<DropdownMenuItem
												key={choice}
												disabled={isBusy}
												onSelect={() => handleSnooze(a.id, choice)}
											>
												{label}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						)
					) : (
						<>
							<Button
								size="sm"
								disabled={isBusy}
								onClick={() => handleCompletePending(a.id)}
							>
								{isBusy ? "处理中…" : "补充"}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="sm" variant="outline" disabled={isBusy}>
										忽略 <ChevronDown className="ml-1 size-3.5 opacity-70" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{SNOOZE_OPTIONS.map(({ choice, label }) => (
										<DropdownMenuItem
											key={choice}
											disabled={isBusy}
											onSelect={() => handleSnooze(a.id, choice)}
										>
											{label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					)}
				</div>
			</article>
		);
	}

	// suggestion
	const s = item.data;
	const key = `${s.assetId}:${s.type}`;

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
					{s.spaceName} · {s.assetName}
				</div>
				<div className="text-sm text-muted-foreground">
					{s.type === "RESTOCK" ? "补货" : "提醒"} — {s.reason}
				</div>
				{s.dueAt && (
					<div className="text-xs text-muted-foreground">
						{s.dueAt.toLocaleDateString()}
					</div>
				)}
			</div>
			<div>
				<Button
					size="sm"
					disabled={busy}
					onClick={() => handleCreateSuggestion(s)}
				>
					{busy ? "创建中…" : "创建行为"}
				</Button>
			</div>
		</article>
	);
}
