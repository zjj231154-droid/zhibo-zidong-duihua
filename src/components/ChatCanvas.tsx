import type { ReactNode } from "react";
import type { CanvasAspectRatio } from "../types/project";

interface ChatCanvasProps {
  aspectRatio: CanvasAspectRatio;
  children: ReactNode;
}

const labels: Record<CanvasAspectRatio, string> = {
  "9:16": "竖版短视频 9:16",
  "3:2": "横版展示 3:2",
  "1:1": "方形内容 1:1",
};

export function ChatCanvas({ aspectRatio, children }: ChatCanvasProps) {
  return (
    <div className={`chat-canvas chat-canvas-${aspectRatio.replace(":", "-")}`} aria-label={labels[aspectRatio]}>
      <div className="chat-scroll-area">{children}</div>
    </div>
  );
}
