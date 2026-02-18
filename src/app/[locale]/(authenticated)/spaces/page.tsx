import { FloorPlanSpacesView } from "@/features/space/components/floor-plan-spaces-view";
import { getSpaces } from "@/features/space/queries/get-spaces";
import { getAllSpacesAssets } from "@/features/space/queries/get-all-spaces-assets";

const SpacePage = async () => {
	const [spaces, allAssets] = await Promise.all([
		getSpaces(),
		getAllSpacesAssets(),
	]);
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<FloorPlanSpacesView spaces={spaces} allAssets={allAssets} />
		</div>
	);
};

export default SpacePage;
