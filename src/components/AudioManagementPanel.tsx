import { ArrowDown, ArrowUp, ListPlus, Upload } from "lucide-react";
import type { Actor, AudioAsset, ScriptLine } from "../types/project";

interface AudioManagementPanelProps {
  actors: Actor[];
  audioAssets: AudioAsset[];
  lines: ScriptLine[];
  onUpload: (actorId: string, files: File[]) => void;
  onAddToDialogue: (audioId: string) => void;
  onBindLineAudio: (lineId: string, audioId?: string) => void;
  onMoveLine: (lineId: string, direction: "up" | "down") => void;
  onDeleteLine: (lineId: string) => void;
}

function formatDuration(duration?: number): string {
  if (!duration || !Number.isFinite(duration)) return "--";
  return `${duration.toFixed(1)}s`;
}

export function AudioManagementPanel({
  actors,
  audioAssets,
  lines,
  onUpload,
  onAddToDialogue,
  onBindLineAudio,
  onMoveLine,
  onDeleteLine,
}: AudioManagementPanelProps) {
  return (
    <section className="audio-management-panel">
      <div className="section-title">音频管理</div>
      <div className="actor-audio-grid">
        {actors.map((actor) => {
          const actorAssets = audioAssets.filter((audio) => audio.actorId === actor.id);
          return (
            <section className="actor-audio-card" key={actor.id}>
              <div className="actor-audio-header">
                <strong>{actor.name}</strong>
                <label className="file-button compact">
                  <Upload size={15} />
                  上传音频
                  <input
                    type="file"
                    multiple
                    accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      if (files.length) onUpload(actor.id, files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="audio-asset-list">
                {actorAssets.length === 0 ? (
                  <span className="muted-text">暂无音频</span>
                ) : (
                  actorAssets.map((audio) => (
                    <div className="audio-asset-row" key={audio.id}>
                      <span title={audio.fileName}>{audio.fileName}</span>
                      <em>{formatDuration(audio.duration)}</em>
                      <button type="button" className="icon-button" title="添加到对话" onClick={() => onAddToDialogue(audio.id)}>
                        <ListPlus size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="dialogue-order-panel">
        <div className="section-title">对话排序列表</div>
        <div className="dialogue-order-list">
          {lines.length === 0 ? (
            <span className="muted-text">暂无对话</span>
          ) : (
            lines.map((line, index) => {
              const actor = actors.find((item) => item.id === line.speakerId);
              const selectedAudio = audioAssets.find((audio) => audio.id === line.audioId);
              const actorAssets = audioAssets.filter((audio) => audio.actorId === line.speakerId);
              return (
                <div className="dialogue-order-row" key={line.id}>
                  <strong>{index + 1}</strong>
                  <span>{actor?.name ?? "未知演员"}</span>
                  <span title={line.text}>{line.text || "[未填写台词]"}</span>
                  <select value={line.audioId ?? ""} onChange={(event) => onBindLineAudio(line.id, event.target.value || undefined)}>
                    <option value="">未绑定音频</option>
                    {actorAssets.map((audio) => (
                      <option value={audio.id} key={audio.id}>
                        {audio.fileName}
                      </option>
                    ))}
                  </select>
                  <em>{formatDuration(selectedAudio?.duration ?? line.duration)}</em>
                  <div className="row-actions">
                    <button type="button" className="icon-button" title="上移" onClick={() => onMoveLine(line.id, "up")}>
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" className="icon-button" title="下移" onClick={() => onMoveLine(line.id, "down")}>
                      <ArrowDown size={15} />
                    </button>
                    <button type="button" className="ghost-button" onClick={() => onDeleteLine(line.id)}>
                      删除
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
