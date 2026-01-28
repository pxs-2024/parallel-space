"use client";

import { useRouter } from "next/navigation";
import {
  snoozeAction,
  completeAction,
  type SnoozeChoice,
} from "@/features/space/actions/respond-to-action";
import type { PendingConfirmAction } from "@/features/space/queries/get-all-assets-for-decisions";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DecisionsPendingListProps = {
  items: PendingConfirmAction[];
};

const SNOOZE_OPTIONS: { choice: SnoozeChoice; label: string }[] = [
  { choice: "ignore_day", label: "忽略一天" },
  { choice: "ignore_week", label: "忽略一星期" },
  { choice: "ignore_month", label: "忽略一个月" },
];

export function DecisionsPendingList({ items }: DecisionsPendingListProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [restockInputId, setRestockInputId] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>("");

  const handleSnooze = async (actionId: string, choice: SnoozeChoice) => {
    setBusy(actionId);
    try {
      const res = await snoozeAction(actionId, choice);
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const handleComplete = async (actionId: string, amount?: number) => {
    setBusy(actionId);
    try {
      const res = await completeAction(actionId, amount);
      if (res.ok) {
        setRestockInputId(null);
        setRestockAmount("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRestockSubmit = (a: PendingConfirmAction) => {
    const n = parseInt(restockAmount, 10);
    if (!Number.isInteger(n) || n < 0) return;
    handleComplete(a.id, n);
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
        const showRestockInput = restockInputId === a.id && a.type === "RESTOCK";
        return (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground">
                {a.spaceName} · {a.assetName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {a.type === "RESTOCK" ? "需补货" : "需提醒"}
                {a.dueAt && ` · ${a.dueAt.toLocaleDateString()}`}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {a.type === "RESTOCK" ? (
                showRestockInput ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder={`补充数量${a.unit ? `（${a.unit}）` : ""}`}
                        value={restockAmount}
                        onChange={(e) => setRestockAmount(e.target.value)}
                        className="w-24"
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={isBusy || !restockAmount.trim()}
                      onClick={() => handleRestockSubmit(a)}
                    >
                      {isBusy ? "处理中…" : "确定"}
                    </Button>
                    <button
                      type="button"
                      className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => {
                        setRestockInputId(null);
                        setRestockAmount("");
                      }}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setRestockInputId(a.id)}
                    className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    补充
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleComplete(a.id)}
                  className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isBusy ? "处理中…" : "补充"}
                </button>
              )}
              {SNOOZE_OPTIONS.map(({ choice, label }) => (
                <button
                  key={choice}
                  type="button"
                  disabled={isBusy || showRestockInput}
                  onClick={() => handleSnooze(a.id, choice)}
                  className="shrink-0 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
