import { redirect } from "next/navigation";
import { getAuth } from "@/features/auth/queries/get-auth";
import { todoPath } from "@/paths";

type HomePageProps = { params: Promise<{ locale: string }> };

const HomePage = async ({ params }: HomePageProps) => {
  const { locale } = await params;
  const auth = await getAuth();
  if (!auth) {
    redirect(`/${locale}/sign-in`);
  }
  redirect(`/${locale}${todoPath()}`);
};

export default HomePage;