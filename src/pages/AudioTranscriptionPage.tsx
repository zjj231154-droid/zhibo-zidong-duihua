import { ArrowDown, ArrowLeft, ArrowRight, FileAudio, ListPlus, Play, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import type { Actor, AudioAsset, ScriptLine } from "../types/project";
import { useProjectStore } from "../store/projectStore";

const statusLabels: Record<string, string> = {
  pending: "待识别",
  transcribing: "识别中",
  completed: "识别完成",
  failed: "识别失败",
  unsupported: "格式不支持",
  missing: "文件丢失",
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
  onAddToDialogue: (audioId: string) => void;
  onDelete: (audioId: string) => void;
}

function ActorAudioWindow({
  actor,
  assets,
  onUpload,
  onTranscribe,
  onEditText,
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
                  value={audio.transcriptionText ?? ""}
                  placeholder="识别后会显示文字，也可以手动输入。"
                  onChange={(event) => onEditText(audio.id, event.target.value)}
                />
              </label>
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
                <button type="button" className="ghost-button danger-text" onClick={() => onDelete(audio.id)}>
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

interface DialogueOrderTableProps {
  actors: Actor[];
  audioAssets: AudioAsset[];
  lines: ScriptLine[];
  onMoveLine: (lineId: string, direction: "up" | "down") => void;
  onSwitchActor: (lineId: string) => void;
  onUpdateText: (lineId: string, text: string) => void;
  onDeleteLine: (lineId: string) => void;
}

function DialogueOrderTable({
  actors,
  audioAssets,
  lines,
  onMoveLine,
  onSwitchActor,
  onUpdateText,
  onDeleteLine,
}: DialogueOrderTableProps) {
  return (
    <section className="dialogue-workbench">
      <div className="section-title">对话排序列表</div>
      {lines.length === 0 ? (
        <div className="empty-state compact">生成对话后，这里会决定最终播放顺序。</div>
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
            return (
              <div className="dialogue-table-row" key={line.id}>
                <strong>{index + 1}</strong>
                <span>{actor?.name ?? "未知演员"}</span>
                <span title={audio?.fileName}>{audio?.fileName ?? "未绑定音频"}</span>
                <input value={line.text} onChange={(event) => onUpdateText(line.id, event.target.value)} />
                <span>{formatDuration(audio?.duration ?? line.duration)}</span>
                <span>{line.isEdited ? "已编辑" : statusLabels[audio?.transcriptionStatus ?? "pending"]}</span>
                <div className="row-actions">
                  <button type="button" className="icon-button" title="上移" onClick={() => onMoveLine(line.id, "up")}>
                    <ArrowUpIcon />
                  </button>
                  <button type="button" className="icon-button" title="下移" onClick={() => onMoveLine(line.id, "down")}>
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="ghost-button" onClick={() => onSwitchActor(line.id)}>
                    切换演员
                  </button>
                  <button type="button" className="ghost-button danger-text" onClick={() => onDeleteLine(line.id)}>
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

function ArrowUpIcon() {
  return <ArrowDown size={15} className="rotate-180" />;
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
    deleteAudioAsset,
    generateDialogueFromAudioAssets,
    addAudioAssetToDialogue,
    moveLine,
    switchLineActor,
    updateLineText,
    deleteLine,
  } = useProjectStore();

  if (!project) return null;

  const actors = project.actors.slice(0, 2);
  const audioAssets = project.audioAssets ?? [];

  return (
    <main className="audio-transcription-screen">
      <header className="audio-page-header">
        <button type="button" className="link-button" onClick={() => setView("new-project")}>
          <ArrowLeft size={17} />
          返回项目设置
        </button>
        <div>
          <h1>音频识别与对话整理</h1>
          <p>{project.name}</p>
        </div>
        <div className="audio-header-actions">
          <button type="button" className="ghost-button" onClick={() => void transcribeAllAudioAssets()}>
            <RefreshCw size={16} />
            识别全部音频
          </button>
          <button type="button" className="ghost-button" onClick={generateDialogueFromAudioAssets}>
            <ListPlus size={16} />
            生成对话
          </button>
          <button type="button" className="ghost-button" onClick={() => void saveCurrentProject()}>
            <Save size={16} />
            保存
          </button>
          <button type="button" className="primary-button" onClick={() => setView("player")}>
            <Play size={16} />
            进入播放
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
            onAddToDialogue={addAudioAssetToDialogue}
            onDelete={deleteAudioAsset}
          />
        ))}
      </section>

      <DialogueOrderTable
        actors={project.actors}
        audioAssets={audioAssets}
        lines={project.lines}
        onMoveLine={moveLine}
        onSwitchActor={switchLineActor}
        onUpdateText={updateLineText}
        onDeleteLine={deleteLine}
      />
    </main>
  );
}
