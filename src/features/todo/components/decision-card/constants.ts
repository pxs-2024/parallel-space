export type SnoozeChoice = "ignore_day" | "ignore_week" | "ignore_month";

export const SNOOZE_OPTIONS: { choice: SnoozeChoice; label: string }[] = [
	{ choice: "ignore_day", label: "忽略一天" },
	{ choice: "ignore_week", label: "忽略一星期" },
	{ choice: "ignore_month", label: "忽略一个月" },
];
