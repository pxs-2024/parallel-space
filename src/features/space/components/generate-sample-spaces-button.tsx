"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createSampleSpaces } from "../actions/create-sample-spaces";
import { Button } from "@/components/ui/button";

type GenerateSampleSpacesButtonProps = {
	className?: string;
};

export function GenerateSampleSpacesButton({ className }: GenerateSampleSpacesButtonProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleClick = async () => {
		setLoading(true);
		try {
			const res = await createSampleSpaces();
			if (res.ok) {
				router.refresh();
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={handleClick}
			disabled={loading}
			className={className}
		>
			<Sparkles className="size-4 mr-1.5" />
			{loading ? "生成中…" : "生成示例空间"}
		</Button>
	);
}
