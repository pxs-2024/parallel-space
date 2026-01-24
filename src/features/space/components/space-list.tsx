import { SpaceItem } from "@/components/space/space-item";
import { getSpaces } from "../queries/get-spaces";
import { spacePath } from "@/paths";
import {Link} from "@/i18n/navigation";

const SpaceList = async () => {
	const spaces = await getSpaces();
	
	return (
		<div className="flex-1 flex flex-wrap gap-4">
			{spaces.map((space) => (
				<Link href={spacePath(space.id)} key={space.id}>
					<SpaceItem space={space} />
				</Link>
			))}
		</div>
	);
};

export { SpaceList };
