"use client";

import { useState, useCallback } from "react";
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
import { acceptAiSuggestion } from "../actions/accept-ai-suggestion";
import type { UserRecommendationsResult } from "@/app/api/recommendations/route";
import type { SpaceMissingItem } from "@/app/api/recommendations/route";

type Step = "loading" | "space" | "done";
type AdoptedSet = Set<string>;

export function AiSuggestionsPanel() {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<UserRecommendationsResult | null>(null);
	const [stepIndex, setStepIndex] = useState(0);
	const [adopted, setAdopted] = useState<AdoptedSet>(new Set());
	const [adoptingKey, setAdoptingKey] = useState<string | null>(null);

	const spacesWithMissing = result
		? result.spaces.filter((s) => s.missingItems.length > 0)
		: [];
	const totalSteps = spacesWithMissing.length;
	const isLastSpace = totalSteps > 0 && stepIndex >= totalSteps - 1;
	const currentSpace = totalSteps > 0 && stepIndex < totalSteps ? spacesWithMissing[stepIndex] : null;
	const step: Step = loading ? "loading" : totalSteps === 0 || stepIndex >= totalSteps ? "done" : "space";
	const progressValue = totalSteps > 0 ? ((stepIndex + (step === "space" ? 1 : 0)) / totalSteps) * 100 : 100;

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

	const handleAdopt = useCallback(
		async (spaceId: string, item: SpaceMissingItem) => {
			const key = `${spaceId}|${item.key}`;
			if (adopted.has(key)) return;
			setAdoptingKey(key);
			try {
				const res = await acceptAiSuggestion({
					spaceId,
					name: item.name,
					needQty: item.needQty,
					unit: item.unit ?? null,
				});
				if (res.ok) {
					setAdopted((prev) => new Set(prev).add(key));
					toast.success(`已加入待办：${item.name}`);
				} else {
					toast.error(res.error ?? "采纳失败");
				}
			} finally {
				setAdoptingKey(null);
			}
		},
		[adopted]
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
				className="min-h-12 w-full rounded-xl text-base font-medium shadow-sm transition-shadow hover:shadow"
			>
				获取 AI 建议
			</Button>

			<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
				<DialogContent
					className="flex max-h-[85vh] max-w-md flex-col gap-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xl **:data-[slot=dialog-close]:text-neutral-500 **:data-[slot=dialog-close]:rounded-lg **:data-[slot=dialog-close]:p-2 **:data-[slot=dialog-close]:hover:text-neutral-900"
					overlayClassName="bg-neutral-900/40"
					showCloseButton={step !== "loading"}
				>
					<DialogHeader className="gap-3 text-left">
						<DialogTitle className="text-xl font-semibold leading-tight text-neutral-900 sm:text-[22px]">
							{step === "loading" && "获取建议中"}
							{step === "space" && currentSpace && `${currentSpace.spaceName} 推荐补充`}
							{step === "done" && "完成"}
						</DialogTitle>
						{step === "loading" && (
							<DialogDescription className="text-sm leading-relaxed text-neutral-600">
								正在根据你的空间与物品生成建议，请稍候…
							</DialogDescription>
						)}
						{step === "space" && currentSpace && (
							<DialogDescription className="text-sm leading-relaxed text-neutral-600">
								第 {stepIndex + 1} / {totalSteps} 个空间，可采纳或忽略每条建议。
							</DialogDescription>
						)}
						{step === "done" && (
							<DialogDescription className="text-sm leading-relaxed text-neutral-600">
								{totalSteps === 0
									? error ?? "当前无明显缺口，清单已较完善。"
									: "已浏览全部空间建议，采纳的项已加入待办。"}
							</DialogDescription>
						)}
					</DialogHeader>

					{step === "space" && totalSteps > 0 && (
						<div
							className="h-2 shrink-0 w-full overflow-hidden rounded-full bg-neutral-200"
							role="progressbar"
							aria-valuenow={Math.round(progressValue)}
							aria-valuemin={0}
							aria-valuemax={100}
						>
							<div
								className="h-full rounded-full bg-neutral-700 transition-transform duration-300 ease-out"
								style={{ width: `${progressValue}%` }}
							/>
						</div>
					)}

					{step === "loading" && (
						<div className="flex flex-col items-center justify-center gap-4 py-8">
							<Loader2
								className="size-10 animate-spin text-neutral-400"
								aria-hidden
							/>
							<span className="text-sm leading-relaxed text-neutral-600">
								获取建议中…
							</span>
						</div>
					)}

					{step === "space" && currentSpace && (
						<div className="min-h-0 flex-1 overflow-y-auto py-1">
							<ul className="space-y-3" role="list">
								{currentSpace.missingItems.map((item) => {
									const key = `${currentSpace.spaceId}|${item.key}`;
									const isAdopted = adopted.has(key);
									const isAdopting = adoptingKey === key;
									return (
										<li
											key={item.key}
											className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 transition-shadow hover:shadow-sm"
										>
											<div className="min-w-0 flex-1 text-sm">
												<span className="font-medium text-neutral-900">{item.name}</span>
												{(item.needQty > 0 || item.unit) && (
													<span className="ml-2 text-neutral-600">
														{item.needQty > 0 && `缺 ${item.needQty}`}
														{item.unit && ` ${item.unit}`}
													</span>
												)}
											</div>
											<div className="flex shrink-0 gap-2">
												<Button
													size="default"
													className={
														isAdopted
															? "min-h-12 min-w-[80px] rounded-xl border-0 bg-neutral-200 text-neutral-600 shadow-none"
															: "min-h-12 min-w-[80px] rounded-xl border-0 bg-neutral-900 text-white shadow-sm hover:bg-neutral-800"
													}
													disabled={isAdopted || isAdopting}
													onClick={() => handleAdopt(currentSpace.spaceId, item)}
												>
													{isAdopted ? (
														<>
															<Check className="size-4 shrink-0" aria-hidden />
															已采纳
														</>
													) : isAdopting ? (
														<>
															<Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
															处理中
														</>
													) : (
														"采纳"
													)}
												</Button>
												<Button
													size="default"
													variant="ghost"
													className="min-h-12 min-w-[72px] rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
													onClick={() => handleIgnore(currentSpace.spaceId, item)}
												>
													忽略
												</Button>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					)}

					{step === "done" && !error && totalSteps > 0 && (
						<div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-4 text-sm leading-relaxed text-neutral-600">
							共 {totalSteps} 个空间有推荐，采纳项已加入待办，可在「待办」中确认。
						</div>
					)}

					<DialogFooter className="shrink-0 gap-2 border-t border-neutral-200 pt-4">
						{step === "space" && (
							<Button
								onClick={handleNext}
								className="min-h-12 min-w-[120px] rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
							>
								{isLastSpace ? "完成" : "下一条"}
							</Button>
						)}
						{step === "done" && (
							<Button
								onClick={handleClose}
								className="min-h-12 min-w-[100px] rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
							>
								关闭
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
