"use client";

import { LucideLoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "../ui/button";
import clsx from "clsx";
import { cloneElement } from "react";

type SubmitButtonProps = {
	label: string;
	icon?: React.ReactElement<{ className?: string }>;
	variant?: "link" | "default" | "outline" | "ghost" | "destructive" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
};

/**
 * 
 * @param label - 标签
 * @param icon - 图标
 * @param variant - 变体
 * @param size - 大小
 * @returns 
 */
const SubmitButton = ({ label, icon, variant, size }: SubmitButtonProps) => {
	const { pending } = useFormStatus();

	return (
		<Button disabled={pending} type="submit" variant={variant} size={size}>
			{pending && (
				<LucideLoaderCircle
					className={clsx("h-4 animate-spin", {
						"m-2": !!label,
					})}
				/>
			)}
			{label}
			{pending
				? null
				: icon && (
						<span
							className={clsx({
								"m-2": !!label,
							})}
						>
							{cloneElement(icon, {
								className: "h-4 w-4",
							})}
						</span>
				  )}
		</Button>
	);
};

export { SubmitButton };
