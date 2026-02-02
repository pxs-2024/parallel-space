"use client";

import { useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { snoozeAction, completeAction, type SnoozeChoice } from "@/features/todo/actions/respond-to-action";
import { getDecisionItemKey } from "./types";
import type { DecisionItem } from "./types";

const REFRESH_DELAY_MS = 280;

export function useDecisionCardActions(item: DecisionItem, onRemoving?: (key: string) => void) {
	const [busy, setBusy] = useState(false);
	const [exiting, setExiting] = useState(false);
	const router = useRouter();

	const onSuccess = useCallback(() => {
		setExiting(true);
		onRemoving?.(getDecisionItemKey(item));
		setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
	}, [item, onRemoving, router]);

	const handleSnooze = useCallback(
		async (actionId: string, choice: SnoozeChoice) => {
			setBusy(true);
			try {
				const res = await snoozeAction(actionId, choice);
				if (res.ok) onSuccess();
			} finally {
				setBusy(false);
			}
		},
		[onSuccess]
	);

	const handleComplete = useCallback(
		async (actionId: string, amount?: number, nextDueAt?: string) => {
			setBusy(true);
			try {
				const res = await completeAction(actionId, amount, nextDueAt);
				if (res.ok) onSuccess();
			} finally {
				setBusy(false);
			}
		},
		[onSuccess]
	);

	return { busy, exiting, handleSnooze, handleComplete };
}
