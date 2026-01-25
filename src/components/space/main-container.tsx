"use client";

import { cn } from "@/lib/utils";
import React from "react";

type MainContainerProps = {
	children: React.ReactNode;
};

/** 仅提供样式容器；DndContext 由 Space 提供并包裹本组件 */
const MainContainer = ({ children }: MainContainerProps) => {
	return (
		<div
			className={cn(
				"h-full w-full border border-black/15 relative overflow-auto select-none",
				"bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)]",
				"bg-size-[40px_40px]"
			)}
		>
			{children}
		</div>
	);
};

export { MainContainer };
