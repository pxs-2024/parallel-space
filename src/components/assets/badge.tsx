import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "muted" | "blue" | "amber" | "red";
};


const Badge = ({
  children,
  variant = "muted",
}: BadgeProps) => {
  const styles =
    variant === "blue"
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : variant === "amber"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : variant === "red"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-muted text-foreground/70 ring-muted";
  return (
    <span className={cn("inline-flex items-center rounded-md px-3 py-1 text-sm ring-1", styles)}>
      {children}
    </span>
  );
};

export { Badge };
