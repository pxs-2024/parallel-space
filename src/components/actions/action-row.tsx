"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

export type ActionType = "AUTO_CONSUME" | "RESTOCK" | "REMIND";
export type ActionStatus = "OPEN" | "DONE" | "PARTIAL" | "SKIPPED" | "CANCELED";

export type ActionRowData = {
  id: string;

  // DB fields (MVP)
  type: ActionType;
  status: ActionStatus;

  dueAt?: Date | string | null;
  requestedAmount?: number | null;
  appliedAmount?: number | null;

  // UI enrichment (通常来自 join asset 或 payload 解析)
  title?: string; // 若不传，则由 type + assetName 生成
  subtitle?: string; // 第二行描述（可选）
  assetName?: string; // 用于拼标题
  lastRunHuman?: string; // “上次运行于 7 小时前”
  createdHuman?: string; // “1天前创建”
};

function normalizeDate(d?: Date | string | null) {
  if (!d) return undefined;
  return typeof d === "string" ? new Date(d) : d;
}

function formatTimeHM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toHumanDue(d?: Date) {
  if (!d) return "";
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);

  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;

  if (abs < hr) {
    const m = Math.max(1, Math.round(abs / min));
    return diff < 0 ? `已逾期 ${m} 分钟` : `${m} 分钟后`;
  }
  if (abs < day) {
    const h = Math.max(1, Math.round(abs / hr));
    return diff < 0 ? `已逾期 ${h} 小时` : `${h} 小时后`;
  }
  const dd = Math.max(1, Math.round(abs / day));
  return diff < 0 ? `已逾期 ${dd} 天` : `${dd} 天后`;
}

function getDefaultTitle(a: ActionRowData) {
  if (a.title) return a.title;

  const asset = a.assetName ? `：${a.assetName}` : "";
  switch (a.type) {
    case "AUTO_CONSUME":
      return `定时消耗${asset}`;
    case "RESTOCK":
      return `补货${asset}`;
    case "REMIND":
      return `提醒${asset}`;
    default:
      return `行为${asset}`;
  }
}

function getDefaultSubtitle(a: ActionRowData) {
  if (a.subtitle) return a.subtitle;

  switch (a.type) {
    case "AUTO_CONSUME": {
      const due = normalizeDate(a.dueAt);
      const dueHuman = due ? `下次执行：${formatTimeHM(due)}` : "";
      return [dueHuman, a.lastRunHuman].filter(Boolean).join(" ｜ ");
    }
    case "RESTOCK":
      return ["库存低于安全库存自动触发", a.lastRunHuman].filter(Boolean).join(" ｜ ");
    case "REMIND":
      return [a.lastRunHuman].filter(Boolean).join(" ｜ ");
    default:
      return a.lastRunHuman ?? "";
  }
}

function isOverdue(status: ActionStatus, dueAt?: Date | string | null) {
  if (status !== "OPEN") return false;
  const d = normalizeDate(dueAt);
  return !!d && d.getTime() < Date.now();
}

function statusLabel(s: ActionStatus) {
  switch (s) {
    case "OPEN":
      return "待处理";
    case "DONE":
      return "已完成";
    case "PARTIAL":
      return "部分完成";
    case "SKIPPED":
      return "已跳过";
    case "CANCELED":
      return "已取消";
    default:
      return s;
  }
}

function statusTone(s: ActionStatus, overdue: boolean) {
  if (overdue) return "amber";
  switch (s) {
    case "DONE":
      return "gray";
    case "PARTIAL":
      return "blue";
    case "SKIPPED":
      return "gray";
    case "CANCELED":
      return "gray";
    case "OPEN":
      return "gray";
    default:
      return "gray";
  }
}

function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: "gray" | "blue" | "amber";
  className?: string;
}) {
  const cls =
    tone === "amber"
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-muted text-foreground/70 ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm ring-1",
        cls,
        className
      )}
    >
      {children}
    </span>
  );
}

export function ActionRow({
  data,
  className,
  onMore,
  onClick,
}: {
  data: ActionRowData;
  className?: string;
  onMore?: (data: ActionRowData) => void;
  onClick?: (data: ActionRowData) => void;
}) {
  const overdue = isOverdue(data.status, data.dueAt);
  const tone = statusTone(data.status, overdue);

  const title = getDefaultTitle(data);
  const subtitle = getDefaultSubtitle(data);

  const due = normalizeDate(data.dueAt);
  const dueHuman = due ? toHumanDue(due) : "";

  const showRatio =
    data.status === "PARTIAL" &&
    typeof data.appliedAmount === "number" &&
    typeof data.requestedAmount === "number";

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-4 rounded-xl border bg-white px-6 py-5 shadow-sm transition",
        "hover:shadow-md hover:border-foreground/10",
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={() => onClick?.(data)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick(data);
      }}
    >
      {/* Left */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-base text-foreground/60">
          {subtitle ? <span className="truncate">{subtitle}</span> : null}
          {overdue && dueHuman ? (
            <span className="text-amber-700/80">｜ {dueHuman}</span>
          ) : null}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <Badge tone={tone}>
          {data.status === "OPEN" && overdue ? "已逾期" : statusLabel(data.status)}
          {showRatio ? (
            <span className="ml-1 text-foreground/70">
              {data.appliedAmount}/{data.requestedAmount}
            </span>
          ) : null}
        </Badge>

        <div className="hidden items-center gap-2 text-sm text-foreground/50 sm:flex">
          {data.createdHuman ? <span>{data.createdHuman}</span> : null}
        </div>

        <button
          type="button"
          className={cn(
            "rounded-md p-2 text-foreground/45 hover:bg-muted hover:text-foreground/70",
            "opacity-100 sm:opacity-60 sm:group-hover:opacity-100"
          )}
          aria-label="更多"
          onClick={(e) => {
            e.stopPropagation();
            onMore?.(data);
          }}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function ActionList({
  items,
  className,
  onMore,
  onRowClick,
}: {
  items: ActionRowData[];
  className?: string;
  onMore?: (data: ActionRowData) => void;
  onRowClick?: (data: ActionRowData) => void;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {items.map((it) => (
        <ActionRow
          key={it.id}
          data={it}
          onMore={onMore}
          onClick={onRowClick}
        />
      ))}
    </div>
  );
}

/** Demo：对应“第一张图片”的视觉与信息密度 */
export function ActionListDemo() {
  const now = Date.now();
  const items: ActionRowData[] = [
    {
      id: "1",
      type: "REMIND",
      status: "DONE",
      title: "备份数据库",
      subtitle: "每天凌晨 3:00 之后执行 ｜ 上次运行于 7 小时前",
      createdHuman: "1天前创建",
    },
    {
      id: "2",
      type: "RESTOCK",
      status: "DONE",
      title: "补充灭火器 ABC 型号",
      subtitle: "灭火器用量低于安全库存自动触发 ｜ 上次运行于 1 天前",
      createdHuman: "3天前创建",
    },
    {
      id: "3",
      type: "REMIND",
      status: "PARTIAL",
      title: "服务器检查",
      subtitle: "每 14 天执行一次 ｜ 上次运行于 8 天前 ｜ 间隔 6 天后",
      appliedAmount: 2,
      requestedAmount: 3,
      createdHuman: "17天前创建",
    },
    {
      id: "4",
      type: "REMIND",
      status: "OPEN",
      title: "更换空调滤网",
      subtitle: "每 3 个月执行一次 ｜ 下一次执行于 2024/07/22",
      dueAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // overdue 2 days
      createdHuman: "75天前创建",
    },
  ];

  return <ActionList items={items} />;
}
