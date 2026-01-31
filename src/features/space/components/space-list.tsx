import { getSpaces } from "../queries/get-spaces";
import { spacePath } from "@/paths";
import {Link} from "@/i18n/navigation";
import { SpaceCard } from "./space-card";

const SpaceList = async () => {
	const spaces = await getSpaces();
	
	return (
		<div className="flex flex-1 flex-wrap items-start content-start gap-4">
			{spaces.map((space) => (
				<Link href={spacePath(space.id)} key={space.id}>
					<SpaceCard name={space.name} description={space.description} />
				</Link>
			))}
		</div>
	);
};

export { SpaceList };
