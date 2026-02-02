import { KindBadge } from "./kind-badge";
import { cn } from "@/lib/utils";
import { LucideMoreHorizontal } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";

type AssetCardData = Prisma.AssetGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    kind: true;
    state: true;
    quantity: true;
    unit: true;
    reorderPoint: true;
    dueAt: true;
    lastDoneAt: true;
    nextDueAt: true;
    refUrl: true;
    expiresAt: true;
  };
}>;

function fmt<T>(v: T | null | undefined, f?: (x: T) => string): string {
  if (v == null) return "—";
  return f ? f(v as T) : String(v);
}

const AssetCard = ({ asset, className }: { asset: AssetCardData | undefined; className?: string }) => {
  if (!asset) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 text-sm text-foreground", className)}>
      <header className="flex items-center justify-between gap-2 border-b pb-2">
        <span className="font-semibold">{asset.name}</span>
        <div className="flex items-center gap-1">
          <KindBadge kind={asset.kind} />
          <button type="button" className="rounded p-1 hover:bg-muted" aria-label="更多" onClick={(e) => e.preventDefault()}>
            <LucideMoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">id</dt>
        <dd className="truncate">{asset.id}</dd>
        <dt className="text-muted-foreground">name</dt>
        <dd>{asset.name}</dd>
        <dt className="text-muted-foreground">description</dt>
        <dd>{fmt(asset.description)}</dd>
        <dt className="text-muted-foreground">kind</dt>
        <dd>{asset.kind}</dd>
        <dt className="text-muted-foreground">state</dt>
        <dd>{asset.state}</dd>
        <dt className="text-muted-foreground">quantity</dt>
        <dd>{fmt(asset.quantity)}</dd>
        <dt className="text-muted-foreground">unit</dt>
        <dd>{fmt(asset.unit)}</dd>
        <dt className="text-muted-foreground">reorderPoint</dt>
        <dd>{fmt(asset.reorderPoint)}</dd>
        <dt className="text-muted-foreground">dueAt</dt>
        <dd>{fmt(asset.dueAt, (d) => (d as Date).toLocaleString())}</dd>
        <dt className="text-muted-foreground">lastDoneAt</dt>
        <dd>{fmt(asset.lastDoneAt, (d) => (d as Date).toLocaleString())}</dd>
        <dt className="text-muted-foreground">nextDueAt</dt>
        <dd>{fmt(asset.nextDueAt, (d) => (d as Date).toLocaleString())}</dd>
        <dt className="text-muted-foreground">refUrl</dt>
        <dd className="truncate">{asset.refUrl ? <a href={asset.refUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{asset.refUrl}</a> : "—"}</dd>
        <dt className="text-muted-foreground">expiresAt</dt>
        <dd>{fmt(asset.expiresAt, (d) => (d as Date).toLocaleString())}</dd>
      </dl>
    </div>
  );
};

export { AssetCard as Card };