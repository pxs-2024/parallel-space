import { getAssetsAndContainers } from "@/features/space/queries/get-assets-or-container";
import { Space } from "@/features/space/components/space";
import { notFound } from "next/navigation";

type SpacePageProps = {
	params: Promise<{ spaceId: string }>;
};

const SpacePage = async ({ params }: SpacePageProps) => {
	const { spaceId } = await params;

	const space = await getAssetsAndContainers(spaceId);
	if (!space) {
		notFound();
	}
	return (
		<Space
			key={`${space.id}-${space.layoutMode}`}
			spaceId={space.id}
			initialItems={space.items}
			initialLayoutMode={space.layoutMode}
		/>
	);
};

export default SpacePage;
