import { FloorPlanSpacesView } from "@/features/space/components/floor-plan-spaces-view";
import { getSpaces } from "@/features/space/queries/get-spaces";

const SpacePage = async () => {
	const spaces = await getSpaces();
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{/* <SpacesPageClient> */}
					<FloorPlanSpacesView spaces={spaces} />
				{/* </SpacesPageClient> */}
		</div>
	);
};

export default SpacePage;
