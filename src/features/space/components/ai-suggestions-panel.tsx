"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadRecommendations } from "../actions/load-recommendations";
import { createNewAssetTodoAction } from "../actions/accept-ai-suggestion";
import type { UserRecommendationsResult } from "@/app/api/recommendations/route";
import type { SpaceMissingItem } from "@/app/api/recommendations/route";

type Step = "loading" | "space" | "done";
type AdoptedSet = Set<string>;

export function AiSuggestionsPanel() {
	const t = useTranslations("aiSuggestions");
	const tCatalog = useTranslations("catalog");
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<UserRecommendationsResult | null>(null);
	const [stepIndex, setStepIndex] = useState(0);
	const [adopted, setAdopted] = useState<AdoptedSet>(new Set());
	const [adoptingKey, setAdoptingKey] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	const spacesWithMissing = result
		? result.spaces.filter((s) => s.missingItems.length > 0)
		: [];
	const totalSteps = spacesWithMissing.length;
	const isLastSpace = totalSteps > 0 && stepIndex >= totalSteps - 1;
	const currentSpace = totalSteps > 0 && stepIndex < totalSteps ? spacesWithMissing[stepIndex] : null;
	const step: Step = loading ? "loading" : totalSteps === 0 || stepIndex >= totalSteps ? "done" : "space";
	const progressValue = totalSteps > 0 ? ((stepIndex + (step === "space" ? 1 : 0)) / totalSteps) * 100 : 100;

	// 切换推荐页时滚动区域回到顶部
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = 0;
		}
	}, [stepIndex]);

	const handleOpen = useCallback(async () => {
		setOpen(true);
		setLoading(true);
		setError(null);
		setResult(null);
		setStepIndex(0);
		setAdopted(new Set());
		try {
			const data = await loadRecommendations();
			if ("error" in data) {
				setError(data.error);
			} else {
				setResult(data);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const getItemDisplayName = useCallback(
		(item: SpaceMissingItem) => tCatalog("item." + item.key) || item.name,
		[tCatalog]
	);

	const handleAdopt = useCallback(
		async (spaceId: string, item: SpaceMissingItem) => {
			const key = `${spaceId}|${item.key}`;
			if (adopted.has(key)) return;
			setAdoptingKey(key);
			const displayName = getItemDisplayName(item);
			try {
				const res = await createNewAssetTodoAction({
					spaceId,
					name: displayName,
					needQty: item.needQty,
					unit: item.unit ?? null,
				});
				if (res.ok) {
					setAdopted((prev) => new Set(prev).add(key));
					toast.success(t("toastAdopted", { name: displayName }));
				} else {
					toast.error(res.error ?? t("toastError"));
				}
			} finally {
				setAdoptingKey(null);
			}
		},
		[adopted, t, getItemDisplayName]
	);

	const handleIgnore = useCallback((_spaceId: string, _item: SpaceMissingItem) => {}, []);

	const handleNext = useCallback(() => {
		if (stepIndex >= totalSteps - 1) {
			setStepIndex(totalSteps);
		} else {
			setStepIndex((i) => i + 1);
		}
	}, [stepIndex, totalSteps]);

	const handleClose = useCallback(() => setOpen(false), []);

	return (
		<>
			<Button
				onClick={handleOpen}
				size="default"
				className="whitespace-nowrap rounded-xl px-5 shadow-sm"
			>
				{t("getButton")}
			</Button>

			<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
				<DialogContent
					className="flex h-[min(420px,85vh)] max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xl **:data-[slot=dialog-close]:text-muted-foreground **:data-[slot=dialog-close]:rounded-lg **:data-[slot=dialog-close]:p-2 **:data-[slot=dialog-close]:hover:text-foreground"
					overlayClassName="bg-black/40"
					showCloseButton={step !== "loading"}
				>
					<DialogHeader className="gap-3 text-left">
						<DialogTitle className="text-xl font-semibold leading-tight text-card-foreground sm:text-[22px]">
							{step === "loading" && t("loading")}
							{step === "space" && currentSpace && t("spaceRecommend", { name: currentSpace.spaceName })}
							{step === "done" && t("done")}
						</DialogTitle>
						{step === "loading" && (
							<DialogDescription className="text-sm leading-relaxed text-muted-foreground">
								{t("loadingHint")}
							</DialogDescription>
						)}
						{step === "space" && currentSpace && (
							<DialogDescription className="text-sm leading-relaxed text-muted-foreground">
								{t("stepHint", { current: stepIndex + 1, total: totalSteps })}
							</DialogDescription>
						)}
						{step === "done" && (
							<DialogDescription className="text-sm leading-relaxed text-muted-foreground">
								{totalSteps === 0 ? error ?? t("noGaps") : t("allDone")}
							</DialogDescription>
						)}
					</DialogHeader>

					{step === "space" && totalSteps > 0 && (
						<div
							className="h-2 shrink-0 w-full overflow-hidden rounded-full bg-muted"
							role="progressbar"
							aria-valuenow={Math.round(progressValue)}
							aria-valuemin={0}
							aria-valuemax={100}
						>
							<div
								className="h-full rounded-full bg-primary transition-transform duration-300 ease-out"
								style={{ width: `${progressValue}%` }}
							/>
						</div>
					)}

					{step === "loading" && (
						<div className="flex flex-col items-center justify-center gap-4 py-8">
							<Loader2
								className="size-10 animate-spin text-muted-foreground"
								aria-hidden
							/>
							<span className="text-sm leading-relaxed text-muted-foreground">
								{t("loadingLabel")}
							</span>
						</div>
					)}

					{step === "space" && currentSpace && (
						<div
							ref={scrollRef}
							className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1"
						>
							<ul className="space-y-3" role="list">
								{currentSpace.missingItems.map((item) => {
									const key = `${currentSpace.spaceId}|${item.key}`;
									const isAdopted = adopted.has(key);
									const isAdopting = adoptingKey === key;
									return (
										<li
											key={item.key}
											className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3 transition-shadow hover:shadow-sm"
										>
											<div className="min-w-0 flex-1 text-sm">
												<span className="font-medium text-foreground">{getItemDisplayName(item)}</span>
												{(item.needQty > 0 || item.unit) && (
													<span className="ml-2 text-muted-foreground">
														{item.needQty > 0 && t("needQty", { qty: item.needQty })}
														{item.unit && ` ${item.unit}`}
													</span>
												)}
											</div>
											<div className="flex shrink-0 flex-wrap gap-2">
												<Button
													size="sm"
													className={
														isAdopted
															? "min-w-[72px] rounded-lg border-0 bg-muted text-muted-foreground shadow-none"
															: "min-w-[72px] rounded-lg border-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
													}
													disabled={isAdopted || isAdopting}
													onClick={() => handleAdopt(currentSpace.spaceId, item)}
												>
													{isAdopted ? (
														<>
															<Check className="size-4 shrink-0" aria-hidden />
															{t("adopted")}
														</>
													) : isAdopting ? (
														<>
															<Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
															{t("adopting")}
														</>
													) : (
														t("adopt")
													)}
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="min-w-[56px] rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
													onClick={() => handleIgnore(currentSpace.spaceId, item)}
												>
													{t("ignore")}
												</Button>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					)}

					{step === "done" && !error && totalSteps > 0 && (
						<div className="rounded-xl border border-border bg-muted/50 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
							{t("summary", { total: totalSteps })}
						</div>
					)}

					<DialogFooter className="shrink-0 gap-2 border-t border-border pt-4">
						{step === "space" && (
							<Button
								onClick={handleNext}
								className="min-h-12 min-w-[120px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
							>
								{isLastSpace ? t("finish") : t("nextOrDone")}
							</Button>
						)}
						{step === "done" && (
							<Button
								onClick={handleClose}
								className="min-h-12 min-w-[100px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
							>
								{t("close")}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
