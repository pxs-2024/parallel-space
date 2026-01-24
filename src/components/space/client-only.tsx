"use client";

import { useEffect, useState } from "react";

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		(() => {
			setMounted(true);
		})();
	}, []);

	if (!mounted) return null; // 或 Skeleton
	return <>{children}</>;
}

export { ClientOnly };