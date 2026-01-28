import { getActionsBySpaceId } from "@/features/space/queries/get-actions";
import { ActionList } from "@/components/actions/action-row";
import type { ActionRowData } from "@/components/actions/action-row";

function formatCreatedHuman(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

type ActionsPageProps = {
  params: Promise<{ spaceId: string }>;
};

const ActionsPage = async ({ params }: ActionsPageProps) => {
  const { spaceId } = await params;
  const actions = await getActionsBySpaceId(spaceId);

  const items: ActionRowData[] = actions.map((a) => ({
    id: a.id,
    type: a.type as ActionRowData["type"],
    status: a.status as ActionRowData["status"],
    dueAt: a.dueAt,
    requestedAmount: a.requestedAmount,
    appliedAmount: a.appliedAmount,
    assetName: a.asset?.name,
    createdHuman: formatCreatedHuman(a.createdAt),
  }));

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">行为</h1>
      <ActionList items={items} />
    </div>
  );
};

export default ActionsPage;
