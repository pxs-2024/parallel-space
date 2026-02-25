import { FloorPlanSpacesView } from "@/features/space/components/floor-plan-spaces-view";
import { getSpacesWithAssets } from "@/features/space/queries/get-spaces-with-assets";

const SpacePage = async () => {
	const { spaces, allAssets } = await getSpacesWithAssets();
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<FloorPlanSpacesView spaces={spaces} allAssets={allAssets} />
		</div>
	);
};

export default SpacePage;
