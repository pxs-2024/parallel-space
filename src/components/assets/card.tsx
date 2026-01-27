import { KindBadge } from "./kind-badge";
import { cn } from "@/lib/utils";
import { LucideExternalLink, LucideLink2, LucideMoreHorizontal } from "lucide-react";
import { Progress } from "../ui/progress";
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
    intervalDays: true;
    lastDoneAt: true;
    nextDueAt: true;
    refUrl: true;
    expiresAt: true;
  };
}>;

function isLowStock(a: AssetCardData | undefined): boolean {
  if (!a) return false;
  return (
    a.kind === "CONSUMABLE" &&
    typeof a.quantity === "number" &&
    typeof a.reorderPoint === "number" &&
    a.quantity <= a.reorderPoint
  );
}

function formatQty(q: number | null, unit?: string) {
  if (typeof q !== "number") return "—";
  return `${q}${unit ? ` ${unit}` : ""}`;
}

function stockProgress(asset: AssetCardData | undefined): number | undefined {
  if (!asset || asset.kind !== "CONSUMABLE") return undefined;
  const qty = asset.quantity;
  if (typeof qty !== "number") return undefined;
  const cap =
    typeof asset.reorderPoint === "number"
      ? Math.max(1, asset.reorderPoint * 2)
      : Math.max(1, qty);
  return Math.min(100, Math.round((qty / cap) * 100));
}

const AssetCard = ({ asset, className }: { asset: AssetCardData | undefined; className?: string }) => {
  if (!asset) return null;
  const progress = stockProgress(asset);
  const low = isLowStock(asset);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md",
        low && "border-amber-300/60",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition group-hover:ring-foreground/10" />

      <header className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-lg font-semibold text-foreground">{asset.name}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <KindBadge kind={asset.kind} />
          <button
            type="button"
            className="rounded p-1.5 text-foreground/50 hover:bg-muted hover:text-foreground/80"
            aria-label="更多"
            onClick={(e) => { e.preventDefault(); }}
          >
            <LucideMoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="mt-3 space-y-2 text-sm">
        {asset.kind === "STATIC" && (
          <p className="line-clamp-2 text-foreground/65">{asset.description ?? "—"}</p>
        )}

        {asset.kind === "CONSUMABLE" && (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-foreground">
                剩余 {formatQty(asset.quantity, asset.unit ?? undefined)}
              </span>
              {low && <span className="text-xs text-amber-600">需补货</span>}
            </div>
            {progress !== undefined && <Progress value={progress} className="h-1.5" />}
            {asset.lastDoneAt && (
              <p className="text-foreground/50">上次：{asset.lastDoneAt.toLocaleDateString()}</p>
            )}
          </>
        )}

        {asset.kind === "TEMPORAL" && (
          <>
            <p className="font-medium text-foreground">
              下次 {asset.nextDueAt?.toLocaleDateString() ?? "—"}
            </p>
            {asset.intervalDays != null && (
              <p className="text-foreground/50">每 {asset.intervalDays} 天</p>
            )}
          </>
        )}

        {asset.kind === "VIRTUAL" && (
          <>
            {asset.refUrl ? (
              <a
                href={asset.refUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 truncate text-foreground hover:underline"
              >
                <LucideLink2 className="h-4 w-4 shrink-0 text-foreground/50" />
                <span className="truncate">{asset.refUrl}</span>
                <LucideExternalLink className="h-3 w-3 shrink-0 text-foreground/40" />
              </a>
            ) : (
              <p className="text-foreground/50">—</p>
            )}
            {asset.expiresAt && (
              <p className="text-foreground/50">过期 {asset.expiresAt.toLocaleDateString()}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export { AssetCard as Card };