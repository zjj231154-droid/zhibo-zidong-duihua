import type { Actor, ScriptLine } from "../types/project";

interface ScriptLineEditorProps {
  lines: ScriptLine[];
  actors: Actor[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ScriptLineEditor({ lines, actors, currentIndex, onSelect }: ScriptLineEditorProps) {
  return (
    <aside className="script-list">
      <div className="section-title">台词列表</div>
      <div className="script-items">
        {lines.map((line, index) => {
          const actor = actors.find((item) => item.id === line.speakerId);
          return (
            <button
              type="button"
              key={line.id}
              className={index === currentIndex ? "script-item active" : "script-item"}
              onClick={() => onSelect(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{actor?.name ?? "未知角色"}</strong>
              <em>{line.text.slice(0, 20) || "空台词"}</em>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
