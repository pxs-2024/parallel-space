import { Badge } from "./badge";
import { $Enums } from "@/generated/prisma/client";

type KindBadgeProps = {
  kind: $Enums.AssetKind;
};

const KindBadge = ({ kind }: KindBadgeProps) => {
  return <Badge variant="blue">{kind.toLowerCase()}</Badge>;
};

export { KindBadge };