import type { UserRecommendationsResult } from "@/app/api/recommendations/route";

export async function loadRecommendations(): Promise<UserRecommendationsResult | { error: string }> {
  const res = await fetch("/api/recommendations", { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    return { error: data?.message ?? "获取建议失败" };
  }
  return data as UserRecommendationsResult;
}