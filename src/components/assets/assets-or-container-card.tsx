import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { useState } from "react";

type AssetsOrContainerCardProps = {
	children: React.ReactNode;
	icon: React.ReactNode;
	name: string;
};
const AssetsOrContainerCard = ({ children, icon, name }: AssetsOrContainerCardProps) => {
	const [isGrabbing, setIsGrabbing] = useState(false);

	const handleMouseUp = () => {
		setIsGrabbing(false);
	};
	const handleMouseDown = () => {
		setIsGrabbing(true);
	};

	return (
		<Card
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			// onMouseLeave={handleMouseUp}
			className={cn(
				// 基础样式（始终存在）
				" aspect-square rounded-3xl  bg-gradient-to-br from-white to-slate-50 border border-white/60 transition-[box-shadow,transform] duration-[300ms,250ms] ease-[ease,ease] aspect-square rounded-3xl bg-gradient-to-br from-white to-slate-50 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-white/60 ",
				// 状态样式
				isGrabbing
					? "cursor-grabbing shadow-[-1px_0_15px_0_rgba(34,33,81,0.01),0px_15px_15px_0_rgba(34,33,81,0.25)] scale-[1.06]"
					: "cursor-grab shadow-none",
			)}
			
		>
			<CardContent className="flex h-full flex-col items-center justify-center gap-3">
        {/* Icon */}
        <div
          className="
            flex h-14 w-14 items-center justify-center
            drop-shadow-md
          "
        >
          {icon}
        </div>

        {/* Name */}
        <div className="text-sm font-medium text-slate-700">
          {name}
        </div>
      </CardContent>
		</Card>
	);
};

export { AssetsOrContainerCard };
