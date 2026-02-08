import { getTranslations } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";
import { getTodoPageData } from "@/features/todo/queries/get-todo-page-data";
import { DecisionsPanel } from "@/features/todo/components/decisions-panel";

const TodoPage = async () => {
  const auth = await getAuth();
  const { pending } = await getTodoPageData(auth);
  const t = await getTranslations("page");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="container mx-auto flex max-w-5xl flex-1 flex-col min-h-0 py-8">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-semibold">{t("todoTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("todoDescription")}</p>
        </div>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card/50 p-6 shadow-sm">
          <DecisionsPanel pending={pending} />
        </section>
      </div>
    </div>
  );
};

export default TodoPage;
