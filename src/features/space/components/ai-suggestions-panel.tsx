"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { streamRecommendations, type StreamEvent } from "../actions/stream-recommendations";
import { createNewAssetTodoAction } from "../actions/accept-ai-suggestion";
import type { SpaceMissingItem } from "@/app/api/recommendations/route";

type StreamBlock = {
	spaceId: string;
	spaceName: string;
	fullText: string;
	displayedLength: number;
	missingItems: SpaceMissingItem[];
	spaceEnd: boolean;
};

type AdoptedSet = Set<string>;
type IgnoredSet = Set<string>;

const TYPING_INTERVAL_MS = 28;

export function AiSuggestionsPanel() {
	const t = useTranslations("aiSuggestions");
	const tCatalog = useTranslations("catalog");
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [blocks, setBlocks] = useState<StreamBlock[]>([]);
	const [progressText, setProgressText] = useState(""); // 准备阶段的流式进度（避免长时间白屏）
	const [streamDone, setStreamDone] = useState(false);
	const [adopted, setAdopted] = useState<AdoptedSet>(new Set());
	const [ignored, setIgnored] = useState<IgnoredSet>(new Set());
	const [adoptingKey, setAdoptingKey] = useState<string | null>(null);
	/** 点击「采纳」后打开的独立弹窗：该空间的建议列表 */
	const [adoptDialogBlock, setAdoptDialogBlock] = useState<StreamBlock | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const streamAbortRef = useRef<AbortController | null>(null);
	const hasReceivedSpaceStartRef = useRef(false);

	// 打字机效果：对每个 block 的 displayedLength 追赶 fullText.length
	useEffect(() => {
		const hasCatchUp = blocks.some((b) => b.displayedLength < b.fullText.length);
		if (!hasCatchUp) return;

		const id = setInterval(() => {
			setBlocks((prev) => {
				let changed = false;
				const next = prev.map((b) => {
					if (b.displayedLength >= b.fullText.length) return b;
					changed = true;
					const step = 1;
					return { ...b, displayedLength: Math.min(b.displayedLength + step, b.fullText.length) };
				});
				return changed ? next : prev;
			});
		}, TYPING_INTERVAL_MS);
		return () => clearInterval(id);
	}, [blocks]);

	// 新内容时滚动到底部
	useEffect(() => {
		if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [blocks]);

	const getItemDisplayName = useCallback(
		(item: SpaceMissingItem) => (tCatalog as (key: string) => string)("item." + item.key) || item.name,
		[tCatalog]
	);

	const handleOpen = useCallback(async () => {
		setOpen(true);
		setLoading(true);
		setError(null);
		setBlocks([]);
		setProgressText("");
		setStreamDone(false);
		setAdopted(new Set());
		setIgnored(new Set());
		setAdoptDialogBlock(null);
		streamAbortRef.current = new AbortController();
		hasReceivedSpaceStartRef.current = false;

		await streamRecommendations((event: StreamEvent) => {
			switch (event.type) {
				case "space_start":
					hasReceivedSpaceStartRef.current = true;
					setBlocks((prev) => [
						...prev,
						{
							spaceId: event.spaceId,
							spaceName: event.spaceName,
							fullText: "",
							displayedLength: 0,
							missingItems: [],
							spaceEnd: false,
						},
					]);
					setLoading(false);
					break;
				case "text":
					if (!hasReceivedSpaceStartRef.current) {
						setProgressText((p) => (p ? p + "\n" : "") + event.text);
					} else {
						setBlocks((prev) => {
							if (prev.length === 0) return prev;
							const last = prev[prev.length - 1];
							return [...prev.slice(0, -1), { ...last, fullText: last.fullText + event.text }];
						});
					}
					break;
				case "data":
					setBlocks((prev) => {
						if (prev.length === 0) return prev;
						const last = prev[prev.length - 1];
						return [...prev.slice(0, -1), { ...last, missingItems: event.missingItems }];
					});
					break;
				case "space_end":
					setBlocks((prev) => {
						if (prev.length === 0) return prev;
						const last = prev[prev.length - 1];
						return [...prev.slice(0, -1), { ...last, spaceEnd: true }];
					});
					break;
				case "error":
					setError(event.message);
					setLoading(false);
					break;
				case "done":
					setStreamDone(true);
					setLoading(false);
					break;
				default:
					break;
			}
		});
	}, []);

	const handleAdoptOne = useCallback(
		async (spaceId: string, item: SpaceMissingItem) => {
			const key = `${spaceId}|${item.key}`;
			if (adopted.has(key)) return;
			setAdoptingKey(key);
			const displayName = getItemDisplayName(item);
			try {
				const res = await createNewAssetTodoAction({
					spaceId,
					name: displayName,
					needQty: typeof item.needQty === "number" && item.needQty > 0 ? item.needQty : 1,
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

	const handleOpenAdoptDialog = useCallback((block: StreamBlock) => {
		setAdoptDialogBlock(block);
	}, []);

	const handleIgnoreOne = useCallback((spaceId: string, item: SpaceMissingItem) => {
		setIgnored((prev) => new Set(prev).add(`${spaceId}|${item.key}`));
	}, []);

	const handleClose = useCallback(() => {
		streamAbortRef.current?.abort();
		setOpen(false);
	}, []);

	const canClose = !loading || streamDone || !!error;
	const hasBlocks = blocks.length > 0;

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
					className="flex h-[min(720px,92vh)] max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xl **:data-[slot=dialog-close]:text-muted-foreground **:data-[slot=dialog-close]:rounded-lg **:data-[slot=dialog-close]:p-2 **:data-[slot=dialog-close]:hover:text-foreground"
					overlayClassName="bg-black/40"
					showCloseButton={canClose}
				>
					<DialogHeader className="shrink-0 gap-2 text-left">
						<DialogTitle className="flex items-center gap-2 text-xl font-semibold leading-tight text-card-foreground sm:text-[22px]">
							<Sparkles className="size-5 text-amber-500" aria-hidden />
							{streamDone ? t("done") : t("checking")}
						</DialogTitle>
						<DialogDescription className="text-sm leading-relaxed text-muted-foreground">
							{loading && !hasBlocks && t("checkingSpace")}
							{error && error}
							{streamDone && !error && hasBlocks && t("allDone")}
							{streamDone && !error && !hasBlocks && t("noGaps")}
						</DialogDescription>
					</DialogHeader>

					{/* 准备阶段进度文案：收到即显示，避免长时间白屏（仅在没有空间块时单独占位） */}
					{progressText && !hasBlocks && (
						<div className="scrollbar-dialog min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/80 bg-muted/30 py-3 px-4">
							<p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
								{progressText}
							</p>
							{loading && !hasBlocks && (
								<div className="mt-4 flex items-center justify-center gap-2">
									<Loader2 className="size-4 animate-spin text-primary" aria-hidden />
									<span className="text-xs text-muted-foreground">{t("loadingLabel")}</span>
								</div>
							)}
						</div>
					)}

					{/* Loading 动画：仅在没有收到任何空间且尚无进度文案时显示 */}
					{loading && !hasBlocks && !progressText && (
						<div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
							<div className="relative flex items-center justify-center">
								<div className="absolute h-14 w-14 animate-ping rounded-full bg-primary/20" />
								<div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Loader2 className="size-6 animate-spin text-primary" aria-hidden />
								</div>
							</div>
							<div className="flex gap-1.5">
								<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
								<span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
							</div>
							<span className="text-sm text-muted-foreground">{t("loadingLabel")}</span>
						</div>
					)}

					{/* 流式内容区：按空间一块一块展示，每块仅一个「采纳」按钮，点击后展开列表可接受/忽略 */}
					{hasBlocks && (
						<div
							ref={scrollRef}
							className="scrollbar-dialog min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-muted/30 py-3 px-4"
						>
							<div className="space-y-6">
								{progressText && (
									<div className="rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
										{progressText}
									</div>
								)}
								{blocks.map((block, idx) => (
									<div
										key={block.spaceId + idx}
										className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
									>
										<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
											{block.spaceName}
										</p>
										{/* 流式文字（打字机效果）；检查中时末尾显示 loading 图标 */}
										<div className="min-h-[1.5em] flex flex-wrap items-center gap-1 text-sm leading-relaxed text-foreground">
											{block.fullText.slice(0, block.displayedLength)}
											{block.displayedLength < block.fullText.length && (
												<span className="inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
											)}
											{((!block.spaceEnd && block.fullText.length > 0) || block.displayedLength < block.fullText.length) && (
												<Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
											)}
										</div>
										{/* 每块一个「采纳」按钮，点击后打开独立弹窗 */}
										{block.missingItems.length > 0 && (
											<div className="mt-3">
												<Button
													size="sm"
													className="rounded-xl px-4 font-medium"
													onClick={() => handleOpenAdoptDialog(block)}
												>
													{t("adoptSuggestions")}
												</Button>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<DialogFooter className="shrink-0 gap-2 border-t border-border pt-4">
						{streamDone && (
							<Button
								onClick={handleClose}
								className="min-h-11 min-w-[100px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
							>
								{t("close")}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 采纳：单独弹窗，可逐条接受或忽略 */}
			<Dialog open={!!adoptDialogBlock} onOpenChange={(open) => !open && setAdoptDialogBlock(null)}>
				<DialogContent className="max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
					<DialogHeader>
						<DialogTitle className="text-lg font-semibold">
							{adoptDialogBlock ? `${adoptDialogBlock.spaceName} - ${t("adoptSuggestions")}` : ""}
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground">
							可逐条采纳或忽略
						</DialogDescription>
					</DialogHeader>
					{adoptDialogBlock && (
						<div className="scrollbar-dialog max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-2">
							<ul className="space-y-1.5" role="list">
								{adoptDialogBlock.missingItems
									.filter((item) => !ignored.has(`${adoptDialogBlock.spaceId}|${item.key}`))
									.map((item) => {
										const key = `${adoptDialogBlock.spaceId}|${item.key}`;
										const isAdopted = adopted.has(key);
										const isAdopting = adoptingKey === key;
										return (
											<li
												key={item.key}
												className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-3 py-2 text-sm"
											>
												<span className="font-medium text-foreground">
													{getItemDisplayName(item)}
													{item.needQty > 1 && (
														<span className="ml-1.5 text-muted-foreground">x{item.needQty}</span>
													)}
												</span>
												<div className="flex shrink-0 gap-1.5">
													<Button
														size="sm"
														className="h-8 rounded-lg"
														disabled={isAdopted || isAdopting}
														onClick={() => handleAdoptOne(adoptDialogBlock.spaceId, item)}
													>
														{isAdopted ? (
															<><Check className="size-3.5" /> {t("adopted")}</>
														) : isAdopting ? (
															<Loader2 className="size-3.5 animate-spin" />
														) : (
															t("adopt")
														)}
													</Button>
													<Button
														size="sm"
														variant="ghost"
														className="h-8 rounded-lg text-muted-foreground hover:text-foreground"
														onClick={() => handleIgnoreOne(adoptDialogBlock.spaceId, item)}
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
					<DialogFooter>
						<Button variant="outline" onClick={() => setAdoptDialogBlock(null)}>
							{t("close")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
