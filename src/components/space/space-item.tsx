import { CardCompact } from "../card-compact";
import { Space } from "./types";
type SpaceItemProps = {
	space: Space;
};
const SpaceItem = ({ space }: SpaceItemProps) => {
	return <CardCompact title={space.name} description={space.description} className="w-40 h-40" />;
};

export { SpaceItem };
