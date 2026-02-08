"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SNOOZE_OPTIONS } from "./constants";
import { cn } from "@/lib/utils";
import type { PendingConfirmAction } from "@/features/todo/queries/get-todo-page-data";
import type { SnoozeChoice } from "@/features/todo/actions/respond-to-action";

type DecisionCardActionsProps = {
	action: PendingConfirmAction;
	busy: boolean;
	onComplete: (actionId: string, amount?: number, nextDueAt?: string) => void;
	onSnooze: (actionId: string, choice: SnoozeChoice) => void;
	showRestockInput: boolean;
	restockAmount: string;
	onRestockAmountChange: (value: string) => void;
	onRestockSubmit: () => void;
	onRestockCancel: () => void;
	onShowRestockInput: (show: boolean) => void;
	showRemindDateInput: boolean;
	remindDueDate: string;
	onRemindDueDateChange: (value: string) => void;
	onRemindSubmit: () => void;
	onRemindCancel: () => void;
	onShowRemindDateInput: (show: boolean) => void;
};

function SnoozeDropdown({
	actionId,
	busy,
	onSnooze,
}: {
	actionId: string;
	busy: boolean;
	onSnooze: (actionId: string, choice: SnoozeChoice) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm" variant="outline" disabled={busy}>
					忽略 <ChevronDown className="ml-1 size-3.5 opacity-70" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				{SNOOZE_OPTIONS.map(({ choice, label }) => (
					<DropdownMenuItem
						key={choice}
						disabled={busy}
						onSelect={() => onSnooze(actionId, choice)}
					>
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function DecisionCardActions({
	action: a,
	busy,
	onComplete,
	onSnooze,
	showRestockInput,
	restockAmount,
	onRestockAmountChange,
	onRestockSubmit,
	onRestockCancel,
	onShowRestockInput,
	showRemindDateInput,
	remindDueDate,
	onRemindDueDateChange,
	onRemindSubmit,
	onRemindCancel,
	onShowRemindDateInput,
}: DecisionCardActionsProps) {
	if (a.type === "DISCARD") {
		return (
			<>
				<Button
					size="sm"
					variant="destructive"
					disabled={busy}
					onClick={() => onComplete(a.id)}
				>
					{busy ? "处理中…" : "确认丢弃"}
				</Button>
				<SnoozeDropdown actionId={a.id} busy={busy} onSnooze={onSnooze} />
			</>
		);
	}

	if (a.type === "RESTOCK") {
		if (showRestockInput) {
			return (
				<>
					<Input
						type="number"
						min={0}
						placeholder={a.unit ? `数量（${a.unit}）` : "数量"}
						value={restockAmount}
						onChange={(e) => onRestockAmountChange(e.target.value)}
						className="w-24"
					/>
					<Button
						size="sm"
						disabled={busy || !restockAmount.trim()}
						onClick={onRestockSubmit}
					>
						{busy ? "处理中…" : "确定"}
					</Button>
					<Button size="sm" variant="ghost" onClick={onRestockCancel}>
						取消
					</Button>
				</>
			);
		}
		return (
			<>
				<Button
					size="sm"
					disabled={busy}
					onClick={() => onShowRestockInput(true)}
				>
					补充（填数量）
				</Button>
				<SnoozeDropdown actionId={a.id} busy={busy} onSnooze={onSnooze} />
			</>
		);
	}

	// REMIND：选择到期时间后更新（使用 shadcn Calendar + Popover）
	if (a.type === "REMIND") {
		if (showRemindDateInput) {
			const selectedDate = remindDueDate.trim()
				? new Date(remindDueDate + "T12:00:00")
				: undefined;
			return (
				<>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								size="sm"
								variant="outline"
								className={cn(
									"h-9 w-36 justify-start gap-2 pl-3 font-normal",
									!selectedDate && "text-muted-foreground"
								)}
							>
								<CalendarIcon className="size-4 shrink-0" />
								{selectedDate
									? format(selectedDate, "yyyy-MM-dd", { locale: zhCN })
									: "选择日期"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={selectedDate}
								onSelect={(d) =>
									d && onRemindDueDateChange(format(d, "yyyy-MM-dd"))
								}
								locale={zhCN}
								disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
							/>
						</PopoverContent>
					</Popover>
					<Button
						size="sm"
						disabled={busy || !remindDueDate.trim()}
						onClick={onRemindSubmit}
					>
						{busy ? "处理中…" : "更新"}
					</Button>
					<Button size="sm" variant="ghost" onClick={onRemindCancel}>
						取消
					</Button>
				</>
			);
		}
		return (
			<>
				<Button
					size="sm"
					disabled={busy}
					onClick={() => onShowRemindDateInput(true)}
				>
					选择到期时间
				</Button>
				<SnoozeDropdown actionId={a.id} busy={busy} onSnooze={onSnooze} />
			</>
		);
	}

	return null;
}
