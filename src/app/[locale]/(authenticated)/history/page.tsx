import { getActionsForHistory } from "@/features/space/queries/get-actions-for-history";
import { ActionType } from "@/generated/prisma/client";

const ACTION_TYPE_LABEL: Record<ActionType, string> = {
	AUTO_CONSUME: "自动消耗",
	RESTOCK: "待补充",
	REMIND: "提醒",
	DISCARD: "丢弃",
};

function formatActionTime(d: Date) {
	return d.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

const HistoryPage = async () => {
	const actions = await getActionsForHistory();

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="container mx-auto max-w-2xl shrink-0 px-4 py-8">
				<h1 className="mb-6 text-2xl font-semibold">历史记录</h1>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
				<ul className="container mx-auto max-w-2xl space-y-3 px-4 pb-8">
				{actions.length === 0 ? (
					<li className="rounded-lg border bg-card px-4 py-6 text-center text-muted-foreground">
						暂无记录
					</li>
				) : (
					actions.map((action) => {
						const spaceName = action.space.name;
						const assetName = action.asset?.name ?? "—";
						const typeLabel = ACTION_TYPE_LABEL[action.type];
						const content = `${spaceName}：${assetName} ${typeLabel}`;
						const timeStr = formatActionTime(new Date(action.createdAt));
						return (
							<li
								key={action.id}
								className="relative rounded-lg border bg-card px-4 py-3 pr-28"
							>
								<p className="text-sm">{content}</p>
								<time
									className="absolute bottom-3 right-4 text-xs text-muted-foreground"
									dateTime={action.createdAt.toISOString()}
								>
									{timeStr}
								</time>
							</li>
						);
					})
				)}
				</ul>
			</div>
		</div>
	);
};

export default HistoryPage;
