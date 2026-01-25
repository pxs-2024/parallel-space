import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { useState } from "react";

type AssetsOrContainerCardProps = {
	icon: React.ReactNode;
	name: string;
	desc: string;
	dragging?: boolean;
	type?: "asset" | "container" | "dummy";
};

const AssetsOrContainerCard = ({
	icon,
	name,
	desc,
	type = "asset",
}: AssetsOrContainerCardProps) => {
	const [isGrabbing, setIsGrabbing] = useState(false);

	const handleMouseDown = () => {
		setIsGrabbing(true);
	};

	const handleMouseUp = () => {
		setIsGrabbing(false);
	};

	const handleMouseLeave = () => {
		setIsGrabbing(false);
	};

	return (
		<Card
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseLeave}
			className={cn(
				"w-40 h-40 aspect-square rounded-3xl transition-[box-shadow,transform] duration-[300ms,250ms] ease-[ease,ease] shadow-[0_20px_40px_rgba(0,0,0,0.08)]",
				type === "dummy" || isGrabbing
					? "cursor-grabbing shadow-[-1px_0_15px_0_rgba(34,33,81,0.01),0px_15px_15px_0_rgba(34,33,81,0.25)] scale-[1.06]"
					: "cursor-grab shadow-none"
			)}
			style={{ transformOrigin: "center center" }}
		>
			<CardContent className="flex h-full flex-col items-center justify-center gap-3">
				<div className="flex h-14 w-14 items-center justify-center drop-shadow-md">
					{icon}
				</div>
				<div className="text-sm font-medium text-slate-700">
					{name}
					<p className="text-xs text-slate-500">{desc}</p>
				</div>
			</CardContent>
		</Card>
	);
};

export { AssetsOrContainerCard };
