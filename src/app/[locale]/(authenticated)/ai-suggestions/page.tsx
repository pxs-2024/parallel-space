import { getTranslations } from "next-intl/server";
import { SPACE_CATALOG } from "@/app/api/recommendations/catalog";
import { AiSuggestionsPanel } from "@/features/space/components/ai-suggestions-panel";

export default async function AiSuggestionsPage() {
	const t = await getTranslations("page");
	const tCatalog = await getTranslations("catalog");
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-8 md:px-6">
			<header className="shrink-0 pt-6 pb-4">
				<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px] sm:leading-tight">
					{t("aiSuggestionsTitle")}
				</h1>
				<p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
					{t("aiSuggestionsDescription")}
				</p>
			</header>

			<section className="w-full max-w-md shrink-0 rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
				<div className="flex flex-nowrap items-center justify-between gap-4">
					<div className="min-w-0 flex-1">
						<h2 className="text-base font-semibold leading-tight text-card-foreground">
							{t("aiSuggestionsGetTitle")}
						</h2>
						<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
							{t("aiSuggestionsGetDescription")}
						</p>
					</div>
					<div className="shrink-0">
						<AiSuggestionsPanel />
					</div>
				</div>
			</section>

			<section className="flex min-h-0 flex-1 flex-col pt-6">
				<h2 className="shrink-0 text-lg font-semibold leading-tight text-foreground">
					{t("aiSuggestionsCatalogTitle")}
				</h2>
				<p className="mt-1 mb-4 shrink-0 text-sm leading-relaxed text-muted-foreground">
					{t("aiSuggestionsCatalogIntro")}
				</p>
				<div className="min-h-0 flex-1 overflow-y-auto pb-2">
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{SPACE_CATALOG.map((space) => (
							<div
								key={space.spaceType}
								className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
							>
								<h3 className="text-base font-semibold leading-snug text-card-foreground">
									{tCatalog("space." + space.spaceType)}
								</h3>
								<p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
									{space.items.map((i) => tCatalog("item." + i.key)).join("、")}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
