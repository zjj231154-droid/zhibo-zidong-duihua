import { Copy, Edit3, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Actor, FontSettings, ScriptLine } from "../types/project";
import { ActorAvatar } from "./ActorAvatar";

interface ChatBubbleProps {
  line: ScriptLine;
  actor: Actor;
  isActive: boolean;
  editing: boolean;
  onEditStart: (lineId: string) => void;
  onEdit: (lineId: string, text: string) => void;
  onDelete: (lineId: string) => void;
  onSwitchActor: (lineId: string) => void;
  onAdd: (lineId: string, placement: "above" | "below") => void;
  onDuplicate: (lineId: string) => void;
  fonts?: FontSettings;
}

export function ChatBubble({
  line,
  actor,
  isActive,
  editing,
  onEditStart,
  onEdit,
  onDelete,
  onSwitchActor,
  onAdd,
  onDuplicate,
  fonts,
}: ChatBubbleProps) {
  const [draft, setDraft] = useState(line.text);
  const sideClass = actor.position === "right" ? "bubble-row right" : "bubble-row left";
  const bubbleStyle = actor.bubbleStyle;

  function saveText() {
    onEdit(line.id, draft);
  }

  return (
    <article className={`${sideClass} ${isActive ? "active" : ""}`} id={`line-${line.id}`}>
      <div className="bubble-avatar">
        <ActorAvatar actor={actor} />
      </div>
      <div className="bubble-stack">
        <div className="bubble-name" style={{ fontFamily: fonts?.actorNameFontFamily }}>
          {actor.name}
        </div>
        <div
          className="bubble"
          style={{
            backgroundColor: bubbleStyle.backgroundColor,
            color: bubbleStyle.textColor,
            borderRadius: bubbleStyle.borderRadius,
            padding: `${bubbleStyle.paddingY}px ${bubbleStyle.paddingX}px`,
            backgroundImage: bubbleStyle.backgroundImagePath ? `url(${bubbleStyle.backgroundImagePath})` : undefined,
            backgroundSize: bubbleStyle.backgroundImageMode === "stretch" ? "100% 100%" : "cover",
            backgroundRepeat: bubbleStyle.backgroundImageMode === "repeat" ? "repeat" : "no-repeat",
            fontFamily: fonts?.chatFontFamily,
          }}
          onClick={() => onEditStart(line.id)}
        >
          {editing ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={saveText}
              autoFocus
              rows={Math.max(2, Math.ceil(draft.length / 26))}
            />
          ) : (
            <p>{line.text || "空台词"}</p>
          )}
        </div>
        <div className="line-tools" aria-label="台词操作">
          <button type="button" title="上方新增" onClick={() => onAdd(line.id, "above")}>
            <Plus size={15} />
          </button>
          <button type="button" title="编辑" onClick={() => onEditStart(line.id)}>
            <Edit3 size={15} />
          </button>
          <button type="button" title="切换角色" onClick={() => onSwitchActor(line.id)}>
            <RefreshCcw size={15} />
          </button>
          <button type="button" title="复制" onClick={() => onDuplicate(line.id)}>
            <Copy size={15} />
          </button>
          <button type="button" title="下方新增" onClick={() => onAdd(line.id, "below")}>
            <Plus size={15} />
          </button>
          <button type="button" title="删除" onClick={() => onDelete(line.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
