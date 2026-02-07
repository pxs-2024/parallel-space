import { getSpaces } from "../queries/get-spaces";
import { getAllSpacesAssets } from "../queries/get-all-spaces-assets";
import { SpaceListClient } from "./space-list-client";

const SpaceList = async () => {
	const [spaces, allAssets] = await Promise.all([
		getSpaces(),
		getAllSpacesAssets(),
	]);
	return <SpaceListClient spaces={spaces} allAssets={allAssets} />;
};

export { SpaceList };
