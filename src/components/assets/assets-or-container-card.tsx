import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { useState } from "react";

type AssetCardProps = {
	icon: React.ReactNode;
	name: string;
	desc: string;
};

const AssetCard = ({
	icon,
	name,
	desc,
}: AssetCardProps) => {
	const [isGrabbing, setIsGrabbing] = useState(false);

	const handleMouseDown = () => {
		setIsGrabbing(true);
	};

	const handleMouseUp = () => {
		setIsGrabbing(false);
	};

	return (
		<Card
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			className={cn(
				// 基础样式（始终存在）
				"w-40 h-40 aspect-square rounded-3xl transition-[box-shadow,transform] duration-[300ms,250ms] ease-[ease,ease] shadow-[0_20px_40px_rgba(0,0,0,0.08)]",
				// 状态样式
				isGrabbing
					? "cursor-grabbing shadow-[-1px_0_15px_0_rgba(34,33,81,0.01),0px_15px_15px_0_rgba(34,33,81,0.25)] scale-[1.06]"
					: "cursor-grab shadow-none"
			)}
		>
			<CardContent className="flex h-full flex-col items-center justify-center gap-3">
				{/* Icon */}
				<div className="flex h-14 w-14 items-center justify-center drop-shadow-md">
					{icon}
				</div>

				{/* Name */}
				<div className="text-sm font-medium text-slate-700">
					{name}
					<p className="text-xs text-slate-500">{desc}</p>
				</div>
			</CardContent>
		</Card>
	);
};

export { AssetCard };
