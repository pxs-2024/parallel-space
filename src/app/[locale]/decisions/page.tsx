import { processConsumablesAndGenerateActions } from "@/features/space/actions/process-consumables-and-generate-actions";
import {
  getAllAssetsForDecisions,
  getOpenActionKeysForDecisions,
  getPendingConfirmActions,
} from "@/features/space/queries/get-all-assets-for-decisions";
import { applyDecisionRules } from "@/features/space/queries/decision-rules";
import { DecisionsSuggestionsList } from "@/features/space/components/decisions-suggestions-list";
import { DecisionsPendingList } from "@/features/space/components/decisions-pending-list";

const DecisionsPage = async () => {
  await processConsumablesAndGenerateActions();

  const [assets, openKeys, pending] = await Promise.all([
    getAllAssetsForDecisions(),
    getOpenActionKeysForDecisions(),
    getPendingConfirmActions(),
  ]);

  const suggested = applyDecisionRules(assets).filter(
    (s) => !openKeys.has(`${s.assetId}:${s.type}`)
  );

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">决策</h1>
      <p className="mb-8 text-muted-foreground">
        进入本页时会按消耗规则自动执行消耗型物品的扣减，并生成需补货/需提醒的行为。请选择「补充」或「忽略」。
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-medium text-foreground/90">
          待确认的行为
        </h2>
        <DecisionsPendingList items={pending} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-foreground/90">
          建议创建的行为
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          根据各空间资产状态生成，选择后即可创建待处理行为。
        </p>
        <DecisionsSuggestionsList items={suggested} />
      </section>
    </div>
  );
};

export default DecisionsPage;
