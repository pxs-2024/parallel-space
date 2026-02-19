"use client";

import { useRouter } from "next/navigation";
import { createActionFromSuggestion } from "@/features/space/actions/create-action-from-suggestion";
import type { SuggestedAction } from "@/features/space/queries/decision-rules";
import type { ActionType } from "@/generated/prisma/client";
import { useState } from "react";

/** 建议类型 REMIND 对应库里的 RESTOCK（时间型延期） */
function toActionType(t: SuggestedAction["type"]): ActionType {
	return t === "REMIND" ? "RESTOCK" : t;
}

type DecisionsSuggestionsListProps = {
  items: SuggestedAction[];
};

export function DecisionsSuggestionsList({ items }: DecisionsSuggestionsListProps) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const handleCreate = async (s: SuggestedAction) => {
    const key = `${s.assetId}:${s.type}`;
    setCreating(key);
    try {
      const res = await createActionFromSuggestion({
        spaceId: s.spaceId,
        assetId: s.assetId,
        type: toActionType(s.type),
        dueAt: s.dueAt ?? undefined,
      });
      if (res.ok) router.refresh();
    } finally {
      setCreating(null);
    }
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border bg-muted/30 px-4 py-6 text-center text-muted-foreground">
        暂无建议，所有资产状态正常
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const key = `${s.assetId}:${s.type}`;
        const isCreating = creating === key;
        return (
          <li
            key={key}
            className="flex items-center justify-between gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground">
                {s.spaceName} · {s.assetName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.type === "RESTOCK" ? "补货" : "提醒"} — {s.reason}
              </div>
              {s.dueAt && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.dueAt.toLocaleDateString()}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={isCreating}
              onClick={() => handleCreate(s)}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? "创建中…" : "创建行为"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
