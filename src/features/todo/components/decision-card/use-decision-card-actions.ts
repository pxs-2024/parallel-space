"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
	completeAction,
	completeNewAssetAction,
} from "@/features/todo/actions/respond-to-action";
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

	const handleRestock = useCallback(
		async (actionId: string, amount: number) => {
			setBusy(true);
			try {
				const res = await completeAction(actionId, amount, undefined);
				if (res.ok) {
					toast.success("已补充");
					onSuccess();
				} else if (res.error) {
					toast.error(res.error);
				}
			} finally {
				setBusy(false);
			}
		},
		[onSuccess]
	);

	const handlePostpone = useCallback(
		async (actionId: string, nextDueAt: string) => {
			setBusy(true);
			try {
				const res = await completeAction(actionId, undefined, nextDueAt);
				if (res.ok) {
					toast.success("已延期");
					onSuccess();
				} else if (res.error) {
					toast.error(res.error);
				}
			} finally {
				setBusy(false);
			}
		},
		[onSuccess]
	);

	const handlePurchased = useCallback(
		async (actionId: string, spaceId: string) => {
			setBusy(true);
			try {
				const res = await completeNewAssetAction(actionId, spaceId);
				if (res.ok) {
					toast.success("已放入空间");
					onSuccess();
				} else if (res.error) {
					toast.error(res.error);
				}
			} finally {
				setBusy(false);
			}
		},
		[onSuccess]
	);

	return { busy, exiting, handleRestock, handlePostpone, handlePurchased };
}
