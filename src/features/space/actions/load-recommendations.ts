import type { UserRecommendationsResult } from "@/app/api/recommendations/route";

export async function loadRecommendations(): Promise<UserRecommendationsResult | { error: string }> {
  const res = await fetch("/api/recommendations", { method: "POST" });
  const text = await res.text();
  if (!text.trim()) {
    return { error: res.ok ? "未返回数据" : "获取建议失败" };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: res.ok ? "返回格式异常" : "获取建议失败" };
  }
  if (!res.ok) {
    const message = data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : "获取建议失败";
    return { error: message };
  }
  return data as UserRecommendationsResult;
}