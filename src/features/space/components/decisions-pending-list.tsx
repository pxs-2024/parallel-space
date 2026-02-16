"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { completeAction } from "@/features/todo/actions/respond-to-action";
import type { PendingRestockItem } from "@/features/todo/queries/get-todo-page-data";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DecisionsPendingListProps = {
	items: PendingRestockItem[];
};

export function DecisionsPendingList({ items }: DecisionsPendingListProps) {
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [postponeId, setPostponeId] = useState<string | null>(null);
	const [postponeDate, setPostponeDate] = useState("");
	const [restockId, setRestockId] = useState<string | null>(null);
	const [restockAmount, setRestockAmount] = useState("");

	const handleRestock = async (actionId: string, amount: number) => {
		setBusy(actionId);
		try {
			const res = await completeAction(actionId, amount, undefined);
			if (res.ok) {
				setRestockId(null);
				setRestockAmount("");
				router.refresh();
			}
		} finally {
			setBusy(null);
		}
	};

	const handlePostpone = async (actionId: string, nextDueAt: string) => {
		setBusy(actionId);
		try {
			const res = await completeAction(actionId, undefined, nextDueAt);
			if (res.ok) {
				setPostponeId(null);
				setPostponeDate("");
				router.refresh();
			}
		} finally {
			setBusy(null);
		}
	};

	if (items.length === 0) {
		return (
			<p className="rounded-xl border bg-muted/30 px-4 py-6 text-center text-muted-foreground">
				暂无待确认行为
			</p>
		);
	}

	return (
		<ul className="space-y-3">
			{items.map((a) => {
				const isBusy = busy === a.id;
				const showRestock = restockId === a.id && a.assetKind === "CONSUMABLE";
				const showPicker = postponeId === a.id && a.assetKind === "TEMPORAL";
				const selectedDate = postponeDate.trim() ? new Date(postponeDate + "T12:00:00") : undefined;
				return (
					<li
						key={a.id}
						className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm"
					>
						<div className="min-w-0 flex-1">
							<div className="font-medium text-foreground">
								{a.spaceName} · {a.assetName}
							</div>
							<div className="mt-1 text-sm text-muted-foreground">
								{a.assetKind === "CONSUMABLE" ? "需补货" : "需延期"}
								{a.dueAt != null && ` · ${new Date(a.dueAt).toLocaleDateString()}`}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{a.assetKind === "CONSUMABLE" ? (
								showRestock ? (
									<>
										<Input
											type="number"
											min={1}
											placeholder={a.unit ? `数量（${a.unit}）` : "数量"}
											value={restockAmount}
											onChange={(e) => setRestockAmount(e.target.value)}
											className="w-24"
										/>
										<Button
											size="sm"
											disabled={!!isBusy || !restockAmount.trim()}
											onClick={() => {
												const n = parseInt(restockAmount, 10);
												if (Number.isInteger(n) && n >= 1) handleRestock(a.id, n);
											}}
										>
											{isBusy ? "处理中…" : "确定"}
										</Button>
										<Button size="sm" variant="ghost" onClick={() => { setRestockId(null); setRestockAmount(""); }}>
											取消
										</Button>
									</>
								) : (
									<Button
										size="sm"
										disabled={!!isBusy}
										onClick={() => { setRestockId(a.id); setRestockAmount(String(a.reorderPoint ?? 1)); }}
									>
										已补充
									</Button>
								)
							) : showPicker ? (
								<>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												size="sm"
												variant="outline"
												className={cn("w-36 justify-start gap-2 pl-3 font-normal", !selectedDate && "text-muted-foreground")}
											>
												<CalendarIcon className="size-4 shrink-0" />
												{selectedDate ? format(selectedDate, "yyyy-MM-dd", { locale: zhCN }) : "选择日期"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="end">
											<Calendar
												mode="single"
												selected={selectedDate}
												onSelect={(d) => d && setPostponeDate(format(d, "yyyy-MM-dd"))}
												locale={zhCN}
												disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
											/>
										</PopoverContent>
									</Popover>
									<Button
										size="sm"
										disabled={!!isBusy || !postponeDate.trim()}
										onClick={() => {
											if (postponeDate.trim()) handlePostpone(a.id, postponeDate);
										}}
									>
										{isBusy ? "处理中…" : "确定"}
									</Button>
									<Button size="sm" variant="ghost" onClick={() => { setPostponeId(null); setPostponeDate(""); }}>
										取消
									</Button>
								</>
							) : (
								<Button
									size="sm"
									variant="outline"
									disabled={!!isBusy}
									onClick={() => {
										setPostponeId(a.id);
										setPostponeDate(a.dueAt ? new Date(a.dueAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
									}}
								>
									延期
								</Button>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
