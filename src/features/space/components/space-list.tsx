import { getSpaces } from "../queries/get-spaces";
import { SpaceListClient } from "./space-list-client";

const SpaceList = async () => {
	const spaces = await getSpaces();
	return <SpaceListClient spaces={spaces} />;
};

export { SpaceList };
