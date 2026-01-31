import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvatarGradient } from "../utils/avatar-gradient";
import { cn } from "@/lib/utils";

type SpaceCardProps = {
	name: string;
	description?: string;
};

const SpaceCard = ({ name, description }: SpaceCardProps) => {
	return (
		<div className="group/card relative w-40">
			<Card
				className={cn(
					"relative z-10 h-40 w-40 overflow-visible",
					"transition-all duration-300 ease-out",
					"hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
				)}
			>
				<CardHeader className="flex flex-col items-center gap-3 py-4">
					<Avatar className="w-16 h-16 ring-2 ring-background/50 transition-transform duration-300 ease-out group-hover/card:scale-105">
						<AvatarFallback
							className="font-geely text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
							style={{ background: getAvatarGradient(name) }}
						>
							{name.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					<CardTitle className="transition-colors duration-300 group-hover/card:text-primary text-center text-sm">
						{name}
					</CardTitle>
				</CardHeader>
			</Card>
			{description ? (
				<div
					className={cn(
						"absolute left-0 right-0 top-full z-20 pt-1",
						"pointer-events-none opacity-0 transition-all duration-300 ease-out delay-75",
						"group-hover/card:pointer-events-auto group-hover/card:opacity-100"
					)}
				>
					<CardDescription
						className={cn(
							"line-clamp-2 rounded-md border bg-card px-3 py-2 text-center text-xs shadow-md",
							"translate-y-1 group-hover/card:translate-y-0 transition-transform duration-300 ease-out delay-75"
						)}
					>
						{description}
					</CardDescription>
				</div>
			) : null}
		</div>
	);
};

export { SpaceCard };
