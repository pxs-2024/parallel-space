import { redirect } from "next/navigation";
import { getAuth } from "@/features/auth/queries/get-auth";

type HomePageProps = { params: Promise<{ locale: string }> };

const HomePage = async ({ params }: HomePageProps) => {
  const { locale } = await params;
  const auth = await getAuth();
  if (!auth) {
    redirect(`/${locale}/sign-in`);
  }
  return (
    <div className="flex-1 flex flex-col gap-y-8">
      todo
    </div>
  );
};

export default HomePage;