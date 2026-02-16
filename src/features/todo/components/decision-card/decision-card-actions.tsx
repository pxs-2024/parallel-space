"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PendingRestockItem } from "@/features/todo/queries/get-todo-page-data";

type DecisionCardActionsProps = {
	item: PendingRestockItem;
	busy: boolean;
	onRestock: (actionId: string, amount: number) => void;
	onPostpone: (actionId: string, nextDueAt: string) => void;
	/** 消耗型：是否显示数量输入 */
	showRestockInput?: boolean;
	restockAmount?: string;
	onRestockAmountChange?: (value: string) => void;
	onRestockSubmit?: () => void;
	onRestockCancel?: () => void;
	onShowRestockInput?: (show: boolean) => void;
	showPostponePicker: boolean;
	postponeDate: string;
	onPostponeDateChange: (value: string) => void;
	onPostponeSubmit: () => void;
	onPostponeCancel: () => void;
	onShowPostponePicker: (show: boolean) => void;
};

export function DecisionCardActions({
	item,
	busy,
	onRestock,
	onPostpone,
	showRestockInput = false,
	restockAmount = "",
	onRestockAmountChange,
	onRestockSubmit,
	onRestockCancel,
	onShowRestockInput,
	showPostponePicker,
	postponeDate,
	onPostponeDateChange,
	onPostponeSubmit,
	onPostponeCancel,
	onShowPostponePicker,
}: DecisionCardActionsProps) {
	if (item.assetKind === "CONSUMABLE") {
		if (showRestockInput) {
			const unitHint = item.unit ? `（${item.unit}）` : "";
			return (
				<>
					<Input
						type="number"
						min={1}
						placeholder={`数量${unitHint}`}
						value={restockAmount}
						onChange={(e) => onRestockAmountChange?.(e.target.value)}
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
			<Button
				size="sm"
				disabled={busy}
				onClick={() => onShowRestockInput?.(true)}
			>
				已补充
			</Button>
		);
	}

	// 时间型：延期 -> 选择时间
	if (showPostponePicker) {
		const selectedDate = postponeDate.trim()
			? new Date(postponeDate + "T12:00:00")
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
							onSelect={(d) => d && onPostponeDateChange(format(d, "yyyy-MM-dd"))}
							locale={zhCN}
							disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
						/>
					</PopoverContent>
				</Popover>
				<Button
					size="sm"
					disabled={busy || !postponeDate.trim()}
					onClick={onPostponeSubmit}
				>
					{busy ? "处理中…" : "确定"}
				</Button>
				<Button size="sm" variant="ghost" onClick={onPostponeCancel}>
					取消
				</Button>
			</>
		);
	}
	return (
		<Button
			size="sm"
			variant="outline"
			disabled={busy}
			onClick={() => onShowPostponePicker(true)}
		>
			已延期
		</Button>
	);
}
