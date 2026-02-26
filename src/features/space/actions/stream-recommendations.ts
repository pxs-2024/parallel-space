import type { SpaceMissingItem } from "@/app/api/recommendations/route";

export type StreamEvent =
  | { type: "space_start"; spaceId: string; spaceName: string }
  | { type: "text"; text: string }
  | { type: "data"; spaceId: string; spaceName: string; missingItems: SpaceMissingItem[] }
  | { type: "space_end" }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * 流式拉取推荐：GET 请求 /api/recommendations/stream，解析 SSE 并逐条回调。
 * 在客户端调用，通过 onEvent 消费事件。
 */
export async function streamRecommendations(
  onEvent: (event: StreamEvent) => void
): Promise<{ error?: string }> {
  const res = await fetch("/api/recommendations/stream", { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    let message = "获取建议失败";
    try {
      const j = JSON.parse(text);
      if (typeof j?.message === "string") message = j.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    onEvent({ type: "error", message });
    return { error: message };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onEvent({ type: "error", message: "无响应体" });
    return { error: "无响应体" };
  }

  const decoder = new TextDecoder();
  let buffer = "";

  function dispatch(eventType: string, dataLine: string) {
    try {
      const data = dataLine ? JSON.parse(dataLine) : {};
      switch (eventType) {
        case "space_start":
          onEvent({ type: "space_start", spaceId: data.spaceId ?? "", spaceName: data.spaceName ?? "" });
          break;
        case "text":
          onEvent({ type: "text", text: data.text ?? "" });
          break;
        case "data":
          onEvent({
            type: "data",
            spaceId: data.spaceId ?? "",
            spaceName: data.spaceName ?? "",
            missingItems: Array.isArray(data.missingItems) ? data.missingItems : [],
          });
          break;
        case "space_end":
          onEvent({ type: "space_end" });
          break;
        case "error":
          onEvent({ type: "error", message: data.message ?? "未知错误" });
          break;
        case "done":
          onEvent({ type: "done" });
          break;
        default:
          break;
      }
    } catch {
      // ignore
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        let eventType = "";
        let dataLine = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataLine = line.slice(6);
        }
        if (eventType || dataLine) dispatch(eventType, dataLine);
      }
    }

    if (buffer.trim()) {
      let eventType = "";
      let dataLine = "";
      for (const line of buffer.split("\n")) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataLine = line.slice(6);
      }
      if (eventType || dataLine) dispatch(eventType, dataLine);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "流式读取失败";
    onEvent({ type: "error", message });
    return { error: message };
  }

  return {};
}
