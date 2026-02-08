import { getTranslations } from "next-intl/server";
import { SpaceList } from "@/features/space/components/space-list";
import { SpacesPageClient } from "@/features/space/components/spaces-page-client";

const SpacePage = async () => {
	const t = await getTranslations("page");
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="container mx-auto flex min-h-0 flex-1 flex-col py-8">
				<div className="mb-4 shrink-0">
					<h1 className="text-2xl font-semibold">{t("spacesTitle")}</h1>
					<p className="text-sm text-muted-foreground mt-1">{t("spacesDescription")}</p>
				</div>
				<SpacesPageClient>
					<SpaceList />
				</SpacesPageClient>
			</div>
		</div>
	);
};

export default SpacePage;
