import { Loader2 } from "lucide-react";

export default function AuthenticatedLoading() {
	return (
		<div
			className="flex min-h-0 flex-1 flex-col items-center justify-center py-24 px-8"
			aria-live="polite"
			aria-busy="true"
		>
			<Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
			<p className="mt-3 text-sm text-muted-foreground">加载中…</p>
		</div>
	);
}
