import { processConsumablesAndGenerateActions } from "@/features/space/actions/process-consumables-and-generate-actions";
import {
  getAllAssetsForDecisions,
  getOpenActionKeysForDecisions,
  getPendingConfirmActions,
} from "@/features/space/queries/get-all-assets-for-decisions";
import { applyDecisionRules } from "@/features/space/queries/decision-rules";
import { DecisionsPanel } from "@/features/space/components/decisions-panel";

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="container mx-auto flex max-w-5xl flex-1 flex-col min-h-0 py-8">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card/50 p-6 shadow-sm">
          <DecisionsPanel pending={pending} suggested={suggested} />
        </section>
      </div>
    </div>
  );
};

export default DecisionsPage;
