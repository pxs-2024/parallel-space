import { getTranslations } from "next-intl/server";
import { SPACE_CATALOG } from "@/app/api/recommendations/catalog";
import { AiSuggestionsPanel } from "@/features/space/components/ai-suggestions-panel";

export default async function AiSuggestionsPage() {
	const t = await getTranslations("page");
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden  px-4 pb-8 md:px-6">
			<header className="shrink-0 pt-6 pb-4">
				<h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-[28px] sm:leading-tight">
					{t("aiSuggestionsTitle")}
				</h1>
				<p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
					{t("aiSuggestionsDescription")}
				</p>
			</header>

			{/* 深色强调卡片：获取 AI 建议（参考「重要倒数」卡片） */}
			<section className="shrink-0 rounded-2xl bg-[#2D323E] shadow-sm">
				<div className="flex flex-col gap-4 p-5 md:p-6">
					<h2 className="text-lg font-semibold leading-tight text-white">
						获取 AI 建议
					</h2>
					<p className="text-sm leading-relaxed text-white/80">
						根据空间与物品生成补充建议，点击下方按钮开始。
					</p>
					<div className="pt-2">
						<div className="[&_button]:min-h-12 [&_button]:w-full [&_button]:rounded-xl [&_button]:bg-white [&_button]:text-[#2D323E] [&_button]:font-medium [&_button]:shadow-sm [&_button]:transition-shadow [&_button:hover]:bg-neutral-100 [&_button:hover]:shadow">
							<AiSuggestionsPanel />
						</div>
					</div>
				</div>
			</section>

			{/* 按空间推荐清单：独立白卡片列表，仅此区域可滚动 */}
			<section className="flex min-h-0 flex-1 flex-col pt-6">
				<h2 className="mb-4 shrink-0 text-lg font-semibold leading-tight text-neutral-900">
					按空间推荐清单
				</h2>
				<div className="min-h-0 flex-1 overflow-y-auto pb-2">
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{SPACE_CATALOG.map((space) => (
							<div
								key={space.spaceType}
								className="rounded-2xl border-0 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
							>
								<h3 className="text-base font-semibold leading-snug text-neutral-900">
									{space.displayName}
								</h3>
								<p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600">
									{space.items.map((i) => i.name).join("、")}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
