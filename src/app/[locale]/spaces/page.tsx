import { SpaceList } from "@/features/space/components/space-list";
import { SpacesPageClient } from "@/features/space/components/spaces-page-client";

const SpacePage = () => {
	return (
		<SpacesPageClient>
			<SpaceList />
		</SpacesPageClient>
	);
};

export default SpacePage;
