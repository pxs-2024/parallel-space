"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Space, ToolId, PointerEvt } from "./engine/types";
import { FloorPlanEngine } from "./engine/engine";	
import { Button } from "@/components/ui/button";	
import { getCanvasPixelSize } from "./utils";
import { useSpaceKeyListener } from "./hooks/useKeyDownLinstener";
import { useInitAndResizeCanvas } from "./hooks/useInitAndResizeCanvas";

type Props = {
  initialSpaces?: Space[] | null;
  persistCallbacks?: any | null;
  editMode?: boolean;
};

export function CanvasGridSelector({ initialSpaces = null, persistCallbacks = null, editMode = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<ToolId>("default");
  const [spaces, setSpaces] = useState<Space[]>(initialSpaces ?? []);

  const spaceKeyRef = useSpaceKeyListener();

  const engine = useMemo(() => {
    return new FloorPlanEngine(
      {
        spaces: initialSpaces ?? [],
        selectedCells: [],
        selectedSpaceId: null,
        hoverSpaceId: null,
        view: { translateX: 0, translateY: 0, scale: 1 },
        overlay: null,
      },
      persistCallbacks
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // resize hook 仍可复用：让 canvas 尺寸正确
  const viewportRef = useInitAndResizeCanvas(canvasRef, wrapRef, { current: engine.getState().view } as any, () => {
    // engine 自己会 render；这里仅确保 viewport 更新
    engine.setViewport(viewportRef.current);
  });

  // attach canvas
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    engine.attachCanvas(c, () => viewportRef.current);
  }, [engine]);

  // tool 同步
  useEffect(() => {
    engine.setTool(editMode ? tool : "default");
  }, [engine, tool, editMode]);

  // 外部 spaces 同步（persist 模式下父组件回灌）
  useEffect(() => {
    if (initialSpaces == null) return;
    setSpaces(initialSpaces);
    engine.syncSpacesFromOutside(initialSpaces);
  }, [initialSpaces, engine]);

  // 输入归一化
  const getScreenXY = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { width, height } = viewportRef.current;
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return { screenX: x, screenY: y };
  };

  const toPointerEvt = (e: React.PointerEvent): PointerEvt | null => {
    const s = getScreenXY(e.clientX, e.clientY);
    if (!s) return null;
    return {
      pointerId: e.pointerId,
      screenX: s.screenX,
      screenY: s.screenY,
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      isSpaceKey: !!spaceKeyRef.current,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const evt = toPointerEvt(e);
    if (!evt) return;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    engine.pointerDown(evt);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const evt = toPointerEvt(e);
    if (!evt) return;
    engine.pointerMove(evt);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const evt = toPointerEvt(e);
    if (!evt) return;
    engine.pointerUp(evt);
  };

  const onWheel = (e: React.WheelEvent) => {
    const s = getScreenXY(e.clientX, e.clientY);
    if (!s) return;
    engine.wheelZoomAt(s.screenX, s.screenY, e.deltaY);
  };

  return (
    <div className="flex flex-1 min-h-0">
      <div ref={wrapRef} className="relative flex-1 border border-border overflow-hidden rounded-md">
        <canvas
          ref={canvasRef}
          className="block touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        />
      </div>

      {editMode && (
        <div className="flex flex-col gap-2 border-l border-border bg-muted/30 px-3 py-3 shrink-0 w-48">
          <Button size="sm" variant={tool === "select" ? "default" : "outline"} onClick={() => setTool(t => (t === "select" ? "default" : "select"))}>
            选择
          </Button>
          <Button size="sm" variant={tool === "deselect" ? "secondary" : "outline"} onClick={() => setTool(t => (t === "deselect" ? "default" : "deselect"))}>
            取消
          </Button>
          <Button size="sm" variant={tool === "cleanSegments" ? "default" : "outline"} onClick={() => setTool(t => (t === "cleanSegments" ? "default" : "cleanSegments"))}>
            清理线段
          </Button>
        </div>
      )}
    </div>
  );
}
