import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FileAudio,
  ListPlus,
  Play,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Actor, AudioAsset, ScriptLine } from "../types/project";
import { useProjectStore } from "../store/projectStore";

const statusLabels: Record<string, string> = {
  pending: "待识别",
  transcribing: "识别中",
  completed: "识别完成",
  failed: "识别失败",
  unsupported: "格式不支持",
  missing: "文件丢失",
  edited: "已人工修改",
};

function formatDuration(duration?: number): string {
  if (!duration || !Number.isFinite(duration)) return "--";
  return `${duration.toFixed(1)}s`;
}

function formatFileSize(size?: number): string {
  if (!size) return "--";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

interface ActorAudioWindowProps {
  actor: Actor;
  assets: AudioAsset[];
  onUpload: (actorId: string, files: File[]) => void;
  onTranscribe: (audioId: string) => void;
  onEditText: (audioId: string, text: string) => void;
  onUseRawText: (audioId: string) => void;
  onAddToDialogue: (audioId: string) => void;
  onDelete: (audioId: string) => void;
}

function ActorAudioWindow({
  actor,
  assets,
  onUpload,
  onTranscribe,
  onEditText,
  onUseRawText,
  onAddToDialogue,
  onDelete,
}: ActorAudioWindowProps) {
  function handleFiles(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (selected.length > 0) onUpload(actor.id, selected);
  }

  return (
    <section
      className="audio-window"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="audio-window-header">
        <div className="actor-mini-profile">
          <div className="avatar-placeholder">{actor.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{actor.name}</strong>
            <span>{actor.position === "left" ? "演员一音频窗口" : "演员二音频窗口"}</span>
          </div>
        </div>
        <label className="file-button compact">
          <Upload size={15} />
          上传音频
          <input
            type="file"
            multiple
            accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,audio/*"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div className="audio-dropzone">
        <FileAudio size={20} />
        拖拽音频到这里，支持 mp3、wav、m4a、aac、ogg、flac、webm
      </div>

      <div className="audio-recognition-list">
        {assets.length === 0 ? (
          <div className="empty-state compact">暂无音频，请上传该演员的分段音频。</div>
        ) : (
          assets.map((audio, index) => (
            <article className="audio-recognition-card" key={audio.id}>
              <div className="audio-card-top">
                <strong>
                  {String(index + 1).padStart(2, "0")} {audio.fileName}
                </strong>
                <span className={`status-pill status-${audio.transcriptionStatus ?? "pending"}`}>
                  {statusLabels[audio.transcriptionStatus ?? "pending"]}
                </span>
              </div>
              <div className="audio-meta-row">
                <span>时长：{formatDuration(audio.duration)}</span>
                <span>格式：{audio.fileType || "--"}</span>
                <span>大小：{formatFileSize(audio.fileSize)}</span>
                <span>顺序：{audio.detectedOrder ?? audio.uploadOrder ?? index + 1}</span>
              </div>
              {audio.filePath && <audio controls src={audio.filePath} />}
              <label className="field compact-field">
                识别文字
                <textarea
                  value={audio.finalText ?? audio.transcriptionText ?? ""}
                  placeholder="识别后会显示文字，也可以手动输入。"
                  onChange={(event) => onEditText(audio.id, event.target.value)}
                />
              </label>
              {audio.rawTranscriptionText && audio.isEdited && (
                <div className="raw-transcription-box">
                  <span>新识别结果：{audio.rawTranscriptionText}</span>
                  <button type="button" className="ghost-button" onClick={() => onUseRawText(audio.id)}>
                    使用新识别结果
                  </button>
                </div>
              )}
              {audio.transcriptionError && <div className="error-banner compact">{audio.transcriptionError}</div>}
              <div className="audio-card-actions">
                <button type="button" className="ghost-button" onClick={() => onTranscribe(audio.id)}>
                  <RefreshCw size={15} />
                  识别文字
                </button>
                <button type="button" className="ghost-button" onClick={() => onAddToDialogue(audio.id)}>
                  <ListPlus size={15} />
                  添加到对话
                </button>
                <button
                  type="button"
                  className="ghost-button danger-text"
                  onClick={() => {
                    if (confirm("是否确认删除该段音频和识别文字？")) onDelete(audio.id);
                  }}
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

interface DialogueOrderWorkbenchProps {
  actors: Actor[];
  audioAssets: AudioAsset[];
  lines: ScriptLine[];
  selectedLineId: string;
  onSelectLine: (lineId: string) => void;
  onMoveLine: (lineId: string, direction: "up" | "down") => void;
  onReorderLineTo: (lineId: string, targetIndex: number) => void;
  onSwitchActor: (lineId: string) => void;
  onUpdateText: (lineId: string, text: string) => void;
  onDeleteLine: (lineId: string) => void;
}

function DialogueOrderWorkbench({
  actors,
  audioAssets,
  lines,
  selectedLineId,
  onSelectLine,
  onMoveLine,
  onReorderLineTo,
  onSwitchActor,
  onUpdateText,
  onDeleteLine,
}: DialogueOrderWorkbenchProps) {
  const [draggingLineId, setDraggingLineId] = useState("");

  return (
    <section className="dialogue-workbench">
      <div className="section-title">整理对话顺序</div>
      {lines.length === 0 ? (
        <div className="empty-state compact">点击“整理对话顺序”或自动排序后，这里会显示最终播放顺序。</div>
      ) : (
        <div className="dialogue-table">
          <div className="dialogue-table-head">
            <span>顺序</span>
            <span>演员</span>
            <span>音频文件</span>
            <span>识别文字</span>
            <span>时长</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {lines.map((line, index) => {
            const actor = actors.find((item) => item.id === line.speakerId);
            const audio = audioAssets.find((item) => item.id === line.audioId);
            const isSelected = selectedLineId === line.id;
            return (
              <div
                className={`dialogue-table-row order-row ${isSelected ? "selected-order-row" : ""}`}
                draggable
                key={line.id}
                onClick={() => onSelectLine(line.id)}
                onDragStart={() => setDraggingLineId(line.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggingLineId) onReorderLineTo(draggingLineId, index);
                  setDraggingLineId("");
                }}
              >
                <input
                  aria-label="手动序号"
                  className="order-number-input"
                  min={1}
                  max={lines.length}
                  type="number"
                  value={index + 1}
                  onChange={(event) => onReorderLineTo(line.id, Number(event.target.value) - 1)}
                />
                <span>{actor?.name ?? "未知演员"}</span>
                <span title={audio?.fileName}>{audio?.fileName ?? "未绑定音频"}</span>
                <input value={line.text} onChange={(event) => onUpdateText(line.id, event.target.value)} />
                <span>{formatDuration(audio?.duration ?? line.duration)}</span>
                <span>{line.isEdited ? "已编辑" : statusLabels[audio?.transcriptionStatus ?? "pending"]}</span>
                <div className="row-actions">
                  <button type="button" className="icon-button" title="上移" onClick={() => onMoveLine(line.id, "up")}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="icon-button" title="下移" onClick={() => onMoveLine(line.id, "down")}>
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="ghost-button" onClick={() => onSwitchActor(line.id)}>
                    切换演员
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger-text"
                    onClick={() => {
                      if (confirm("是否确认删除该段音频和识别文字？")) onDeleteLine(line.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface DialogueDetailPanelProps {
  actors: Actor[];
  audio?: AudioAsset;
  line?: ScriptLine;
  onUpdateText: (lineId: string, text: string) => void;
  onSwitchActor: (lineId: string) => void;
}

function DialogueDetailPanel({ actors, audio, line, onUpdateText, onSwitchActor }: DialogueDetailPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const actor = actors.find((item) => item.id === line?.speakerId);

  return (
    <aside className="order-detail-panel">
      <div className="section-title">当前选中音频详情</div>
      {!line ? (
        <div className="empty-state compact">选择一条对话后，可以在这里播放单段、编辑文字和切换演员。</div>
      ) : (
        <div className="order-detail-content">
          <div className="detail-field">
            <span>演员</span>
            <strong>{actor?.name ?? "未知演员"}</strong>
          </div>
          <div className="detail-field">
            <span>音频</span>
            <strong>{audio?.fileName ?? "未绑定音频"}</strong>
          </div>
          <div className="detail-field">
            <span>状态</span>
            <strong>{line.isEdited ? "已编辑" : statusLabels[audio?.transcriptionStatus ?? "pending"]}</strong>
          </div>
          {audio?.filePath && <audio ref={audioRef} controls src={audio.filePath} />}
          <label className="field compact-field">
            识别文字
            <textarea value={line.text} onChange={(event) => onUpdateText(line.id, event.target.value)} />
          </label>
          <div className="audio-card-actions">
            <button type="button" className="ghost-button" onClick={() => void audioRef.current?.play()}>
              <Play size={15} />
              播放本段
            </button>
            <button type="button" className="ghost-button" onClick={() => onSwitchActor(line.id)}>
              切换演员
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function AudioTranscriptionPage() {
  const {
    project,
    errorMessage,
    lastMessage,
    setView,
    saveCurrentProject,
    uploadActorAudioAssets,
    transcribeAudioAsset,
    transcribeAllAudioAssets,
    updateAudioAssetTranscription,
    useRawTranscriptionText,
    deleteAudioAsset,
    generateDialogueFromAudioAssets,
    addAudioAssetToDialogue,
    moveLine,
    reorderLineTo,
    sortDialogueLines,
    switchLineActor,
    updateLineText,
    deleteLine,
  } = useProjectStore();
  const [selectedLineId, setSelectedLineId] = useState("");

  const actors = project?.actors.slice(0, 2) ?? [];
  const audioAssets = useMemo(() => project?.audioAssets ?? [], [project?.audioAssets]);
  const selectedLine = project?.lines.find((line) => line.id === selectedLineId) ?? project?.lines[0];
  const selectedAudio = audioAssets.find((audio) => audio.id === selectedLine?.audioId);

  if (!project) return null;
  const currentProject = project;

  function prepareOrderList() {
    if (currentProject.audioAssets?.some((audio) => audio.transcriptionStatus !== "completed")) {
      const shouldContinue = confirm("仍有音频未完成识别，是否继续整理对话顺序？未识别内容会显示为 [未识别文字]。");
      if (!shouldContinue) return;
    }
    generateDialogueFromAudioAssets();
  }

  function openPlayer() {
    if (currentProject.lines.length === 0) {
      prepareOrderList();
    }
    saveCurrentProject().then(() => setView("player"));
  }

  return (
    <main className="audio-transcription-screen">
      <header className="audio-page-header">
        <button type="button" className="link-button" onClick={() => setView("new-project")}>
          <ArrowLeft size={17} />
          返回上传音频
        </button>
        <div>
          <h1>整理对话顺序</h1>
          <p>{project.name}</p>
        </div>
        <div className="audio-header-actions">
          <button type="button" className="ghost-button" onClick={() => void transcribeAllAudioAssets()}>
            <RefreshCw size={16} />
            重新识别全部
          </button>
          <button type="button" className="ghost-button" onClick={prepareOrderList}>
            <ListPlus size={16} />
            整理对话顺序
          </button>
          <button type="button" className="ghost-button" onClick={() => sortDialogueLines("fileName")}>
            按文件名排序
          </button>
          <button type="button" className="ghost-button" onClick={() => sortDialogueLines("uploadTime")}>
            按上传时间排序
          </button>
          <button type="button" className="ghost-button" onClick={() => sortDialogueLines("alternateActors")}>
            演员交替排序
          </button>
          <button type="button" className="ghost-button" onClick={() => void saveCurrentProject()}>
            <Save size={16} />
            保存顺序
          </button>
          <button type="button" className="primary-button" onClick={openPlayer}>
            <Play size={16} />
            生成对话界面
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {lastMessage && <div className="success-banner">{lastMessage}</div>}
      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      <section className="audio-window-grid">
        {actors.map((actor) => (
          <ActorAudioWindow
            key={actor.id}
            actor={actor}
            assets={audioAssets.filter((audio) => audio.actorId === actor.id)}
            onUpload={(actorId, files) => void uploadActorAudioAssets(actorId, files)}
            onTranscribe={(audioId) => void transcribeAudioAsset(audioId)}
            onEditText={updateAudioAssetTranscription}
            onUseRawText={useRawTranscriptionText}
            onAddToDialogue={addAudioAssetToDialogue}
            onDelete={deleteAudioAsset}
          />
        ))}
      </section>

      <section className="order-layout">
        <DialogueOrderWorkbench
          actors={project.actors}
          audioAssets={audioAssets}
          lines={project.lines}
          selectedLineId={selectedLine?.id ?? ""}
          onSelectLine={setSelectedLineId}
          onMoveLine={moveLine}
          onReorderLineTo={reorderLineTo}
          onSwitchActor={switchLineActor}
          onUpdateText={updateLineText}
          onDeleteLine={deleteLine}
        />
        <DialogueDetailPanel
          actors={project.actors}
          audio={selectedAudio}
          line={selectedLine}
          onUpdateText={updateLineText}
          onSwitchActor={switchLineActor}
        />
      </section>
    </main>
  );
}
