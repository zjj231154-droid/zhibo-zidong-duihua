import { useEffect, useMemo, useRef, useState } from "react";
import { AudioManagementPanel } from "../components/AudioManagementPanel";
import { ChatBubble } from "../components/ChatBubble";
import { ChatCanvas } from "../components/ChatCanvas";
import { PlaybackControls } from "../components/PlaybackControls";
import { ProjectHeader } from "../components/ProjectHeader";
import { ScriptLineEditor } from "../components/ScriptLineEditor";
import { useProjectStore } from "../store/projectStore";
import type { BackgroundFit, PlaybackSpeed, SubtitleSegment } from "../types/project";
import {
  downloadTextFile,
  exportProjectAsJson,
  exportProjectAsMarkdown,
  exportProjectAsTxt,
} from "../utils/exportProject";
import { applyFontSettings } from "../utils/fontLoader";
import { getLineDuration } from "../utils/playbackTime";
import { findSubtitleAtTime } from "../utils/subtitleTimeline";

function backgroundSizing(fit?: BackgroundFit) {
  if (fit === "contain") return { backgroundSize: "contain", backgroundRepeat: "no-repeat" };
  if (fit === "repeat") return { backgroundSize: "auto", backgroundRepeat: "repeat" };
  if (fit === "center") return { backgroundSize: "auto", backgroundRepeat: "no-repeat" };
  return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
}

function formatTime(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "00:00.000";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(3).padStart(6, "0")}`;
}

function parseTimeInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed.includes(":")) return Number(trimmed);
  const parts = trimmed.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.NaN;
}

export function PlayerPage() {
  const {
    project,
    currentIndex,
    playbackStatus,
    lastMessage,
    errorMessage,
    setView,
    saveCurrentProject,
    setCurrentIndex,
    setPlaybackStatus,
    setPlaybackSpeed,
    setPlaybackMode,
    setAutoScroll,
    regenerateSubtitleTimeline,
    updateSubtitleSegment,
    uploadActorAudioAssets,
    addAudioAssetToDialogue,
    bindLineAudio,
    moveLine,
    updateLineText,
    switchLineActor,
    deleteLine,
    addLine,
    duplicateLine,
  } = useProjectStore();
  const [editingLineId, setEditingLineId] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  const timerRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentAudio = useMemo(() => {
    if (!project) return undefined;
    return project.audioSources?.find((audio) => audio.id === project.playback.currentAudioId) ?? project.audioSources?.[0];
  }, [project]);

  const currentLineAudio = useMemo(() => {
    if (!project) return undefined;
    const currentLine = project.lines[currentIndex];
    if (!currentLine?.audioId) return undefined;
    return project.audioAssets?.find((audio) => audio.id === currentLine.audioId);
  }, [currentIndex, project]);

  const hasOrderedAudio = useMemo(
    () => Boolean(project?.lines.some((line) => line.audioId && project.audioAssets?.some((audio) => audio.id === line.audioId))),
    [project],
  );

  useEffect(() => {
    applyFontSettings(project?.theme.fonts);
  }, [project?.theme.fonts]);

  useEffect(() => {
    if (!project || project.playback.mode !== "text" || playbackStatus !== "playing") return;
    const currentLine = project.lines[currentIndex];
    if (!currentLine) {
      setPlaybackStatus("ended");
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const nextIndex = project.lines.findIndex((line, index) => index > currentIndex && line.text.trim());
      if (nextIndex === -1) setPlaybackStatus("ended");
      else setCurrentIndex(nextIndex);
    }, getLineDuration(currentLine.text, project.playback.speed));

    return () => window.clearTimeout(timerRef.current);
  }, [currentIndex, playbackStatus, project, setCurrentIndex, setPlaybackStatus]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !project || project.playback.mode !== "audio") return;
    const audioElement = audio;
    const activeProject = project;

    function syncFromAudio() {
      const currentTime = audioElement.currentTime;
      setAudioTime(currentTime);
      if (hasOrderedAudio) return;
      const segment = findSubtitleAtTime(currentAudio?.subtitles ?? [], currentTime);
      if (!segment) return;
      const index = activeProject.lines.findIndex((line) => line.id === segment.lineId);
      if (index >= 0 && index !== currentIndex) setCurrentIndex(index);
    }

    function onPlay() {
      setPlaybackError("");
      setPlaybackStatus("playing");
    }

    function onPause() {
      setPlaybackStatus("paused");
    }

    function onEnded() {
      if (!hasOrderedAudio) {
        setPlaybackStatus("ended");
        return;
      }
      const nextIndex = activeProject.lines.findIndex((line, index) => index > currentIndex && (line.text.trim() || line.audioId));
      if (nextIndex === -1) {
        setPlaybackStatus("ended");
        return;
      }
      window.setTimeout(() => {
        setCurrentIndex(nextIndex);
        setPlaybackStatus("playing");
      }, 300);
    }

    audioElement.addEventListener("timeupdate", syncFromAudio);
    audioElement.addEventListener("seeked", syncFromAudio);
    audioElement.addEventListener("play", onPlay);
    audioElement.addEventListener("pause", onPause);
    audioElement.addEventListener("ended", onEnded);
    return () => {
      audioElement.removeEventListener("timeupdate", syncFromAudio);
      audioElement.removeEventListener("seeked", syncFromAudio);
      audioElement.removeEventListener("play", onPlay);
      audioElement.removeEventListener("pause", onPause);
      audioElement.removeEventListener("ended", onEnded);
    };
  }, [currentAudio?.subtitles, currentIndex, hasOrderedAudio, project, setCurrentIndex, setPlaybackStatus]);

  useEffect(() => {
    if (!project?.playback.autoScroll) return;
    const line = project.lines[currentIndex];
    if (!line) return;
    document.getElementById(`line-${line.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentIndex, project?.playback.autoScroll, project?.lines]);

  useEffect(() => {
    if (!project || project.playback.mode !== "audio" || playbackStatus !== "playing" || !hasOrderedAudio) return;
    const currentLine = project.lines[currentIndex];
    if (!currentLine) {
      setPlaybackStatus("ended");
      return;
    }
    const audio = project.audioAssets?.find((item) => item.id === currentLine.audioId);
    if (audio?.filePath) {
      const audioElement = audioRef.current;
      if (!audioElement) return;
      audioElement.load();
      const playPromise = audioElement.play();
      if (playPromise) {
        void playPromise.catch(() => {
          setPlaybackStatus("paused");
          setPlaybackError("音频播放被浏览器拦截，请点击上方音频控件的播放按钮，或重新点击底部播放。");
        });
      }
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const nextIndex = project.lines.findIndex((line, index) => index > currentIndex && (line.text.trim() || line.audioId));
      if (nextIndex === -1) setPlaybackStatus("ended");
      else setCurrentIndex(nextIndex);
    }, getLineDuration(currentLine.text || "[未填写台词]", project.playback.speed));

    return () => window.clearTimeout(timerRef.current);
  }, [currentIndex, hasOrderedAudio, playbackStatus, project, setCurrentIndex, setPlaybackStatus]);

  if (!project) return null;
  const activeProject = project;
  const background = activeProject.theme.background;
  const backgroundStyle = backgroundSizing(background?.fit);
  const aspectRatio = activeProject.theme.canvas?.aspectRatio ?? "9:16";

  function nextPlayableIndex(fromIndex: number): number {
    for (let index = fromIndex + 1; index < activeProject.lines.length; index += 1) {
      if (activeProject.lines[index].text.trim() || activeProject.lines[index].audioId) return index;
    }
    return -1;
  }

  function previousPlayableIndex(fromIndex: number): number {
    for (let index = fromIndex - 1; index >= 0; index -= 1) {
      if (activeProject.lines[index].text.trim() || activeProject.lines[index].audioId) return index;
    }
    return -1;
  }

  function play() {
    if (activeProject.playback.mode === "audio") {
      if (!currentLineAudio?.filePath && !currentAudio?.filePath && !hasOrderedAudio) {
        setPlaybackMode("audio");
        return;
      }
      const audioElement = audioRef.current;
      if (!audioElement) {
        setPlaybackError("音频播放器还没有准备好，请稍后再试。");
        return;
      }
      if (currentLineAudio?.filePath) audioElement.src = currentLineAudio.filePath;
      const playPromise = audioElement.play();
      if (playPromise) {
        void playPromise.catch(() => {
          setPlaybackStatus("paused");
          setPlaybackError("音频播放被浏览器拦截，请点击上方音频控件的播放按钮，或重新点击底部播放。");
        });
      }
      return;
    }
    setPlaybackError("");
    if (activeProject.lines.length === 0) return;
    if (currentIndex < 0 || playbackStatus === "ended") {
      const first = activeProject.lines.findIndex((line) => line.text.trim() || line.audioId);
      setCurrentIndex(first === -1 ? 0 : first);
    }
    setPlaybackStatus("playing");
  }

  function pause() {
    if (activeProject.playback.mode === "audio") audioRef.current?.pause();
    setPlaybackError("");
    setPlaybackStatus("paused");
  }

  function restart() {
    if (activeProject.playback.mode === "audio" && audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioTime(0);
    }
    const first = activeProject.lines.findIndex((line) => line.text.trim() || line.audioId);
    setPlaybackError("");
    setCurrentIndex(first === -1 ? 0 : first);
    setPlaybackStatus("idle");
  }

  function goNext() {
    const nextIndex = nextPlayableIndex(currentIndex);
    if (nextIndex === -1) setPlaybackStatus("ended");
    else setCurrentIndex(nextIndex);
    if (!hasOrderedAudio && activeProject.playback.mode === "audio" && currentAudio?.subtitles && audioRef.current) {
      const line = activeProject.lines[nextIndex];
      const segment = currentAudio.subtitles.find((item) => item.lineId === line?.id);
      if (segment) audioRef.current.currentTime = segment.startTime;
    }
  }

  function goPrevious() {
    const previousIndex = previousPlayableIndex(currentIndex);
    if (previousIndex !== -1) setCurrentIndex(previousIndex);
    if (!hasOrderedAudio && activeProject.playback.mode === "audio" && currentAudio?.subtitles && audioRef.current) {
      const line = activeProject.lines[previousIndex];
      const segment = currentAudio.subtitles.find((item) => item.lineId === line?.id);
      if (segment) audioRef.current.currentTime = segment.startTime;
    }
  }

  function exportFile(format: "txt" | "md" | "json") {
    const safeName = activeProject.name.replace(/[<>:"/\\|?*]/g, "_");
    if (format === "txt") downloadTextFile(exportProjectAsTxt(activeProject), `${safeName}.txt`, "text/plain");
    if (format === "md") downloadTextFile(exportProjectAsMarkdown(activeProject), `${safeName}.md`, "text/markdown");
    if (format === "json") downloadTextFile(exportProjectAsJson(activeProject), `${safeName}.json`, "application/json");
    setExportOpen(false);
  }

  function updateSegment(segment: SubtitleSegment, field: "startTime" | "endTime", value: string) {
    const nextValue = parseTimeInput(value);
    if (!Number.isFinite(nextValue) || !currentAudio) return;
    updateSubtitleSegment(currentAudio.id, segment.id, { [field]: Number(nextValue.toFixed(3)) });
  }

  return (
    <main className="player-screen">
      <ProjectHeader
        projectName={project.name}
        onHome={() => setView("home")}
        onSettings={() => setView("actor-setup")}
        onTheme={() => setView("theme-setup")}
        onExport={() => setExportOpen(true)}
        onSave={() => void saveCurrentProject()}
      />
      <div className="status-strip">
        <span>状态：{playbackStatus}</span>
        <span>
          当前：{currentIndex + 1} / {project.lines.length}
        </span>
        <span>模式：{project.playback.mode === "audio" ? "音频" : "文字"}</span>
        {project.playback.mode === "audio" && project.lines[currentIndex] && (
          <span>
            正在播放：{project.actors.find((actor) => actor.id === project.lines[currentIndex].speakerId)?.name ?? "未知演员"}
          </span>
        )}
        {lastMessage && <strong>{lastMessage}</strong>}
        {errorMessage && <strong className="status-error">{errorMessage}</strong>}
        {playbackError && <strong className="status-error">{playbackError}</strong>}
      </div>
      <section className="player-layout">
        <ScriptLineEditor
          lines={project.lines}
          actors={project.actors}
          currentIndex={currentIndex}
          onSelect={(index) => {
            setCurrentIndex(index);
            setPlaybackStatus("paused");
          }}
        />
        <AudioManagementPanel
          actors={project.actors}
          audioAssets={project.audioAssets ?? []}
          lines={project.lines}
          onUpload={(actorId, files) => void uploadActorAudioAssets(actorId, files)}
          onAddToDialogue={addAudioAssetToDialogue}
          onBindLineAudio={bindLineAudio}
          onMoveLine={moveLine}
          onDeleteLine={deleteLine}
        />
        <section className="canvas-stage">
          <ChatCanvas aspectRatio={aspectRatio}>
            <section className="chat-window themed-chat-window" aria-label="聊天对话区">
              {background?.imagePath && (
                <div
                  className="chat-background-layer"
                  style={{
                    backgroundImage: `url(${background.imagePath})`,
                    backgroundPosition: "center",
                    ...backgroundStyle,
                    opacity: background.opacity / 100,
                    filter: `blur(${background.blur}px)`,
                  }}
                />
              )}
              <div className="chat-content-layer">
                {project.lines.map((line, index) => {
                  const actor = project.actors.find((item) => item.id === line.speakerId) ?? project.actors[0];
                  return (
                    <ChatBubble
                      key={line.id}
                      line={line}
                      actor={actor}
                      fonts={project.theme.fonts}
                      isActive={index === currentIndex}
                      editing={editingLineId === line.id}
                      onEditStart={setEditingLineId}
                      onEdit={(lineId, text) => {
                        updateLineText(lineId, text);
                        setEditingLineId("");
                        void saveCurrentProject();
                      }}
                      onDelete={(lineId) => confirm("确定删除这条台词吗？") && deleteLine(lineId)}
                      onSwitchActor={switchLineActor}
                      onAdd={(lineId, placement) => {
                        const newLineId = addLine(lineId, placement);
                        if (newLineId) setEditingLineId(newLineId);
                      }}
                      onDuplicate={(lineId) => {
                        const newLineId = duplicateLine(lineId);
                        if (newLineId) setEditingLineId(newLineId);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          </ChatCanvas>
        </section>
      </section>

      <section className="audio-sync-panel">
        <div className="segmented" aria-label="播放模式">
          <button type="button" className={project.playback.mode === "text" ? "selected" : ""} onClick={() => setPlaybackMode("text")}>
            文字模式
          </button>
          <button
            type="button"
            className={project.playback.mode === "audio" ? "selected" : ""}
            onClick={() => setPlaybackMode("audio")}
            disabled={!currentAudio?.filePath && !hasOrderedAudio}
          >
            音频模式
          </button>
        </div>
        {hasOrderedAudio ? (
          <div className="audio-player-row">
            <audio
              ref={audioRef}
              src={currentLineAudio?.filePath}
              controls
              preload="metadata"
              onError={() => setPlaybackError("音频文件无法播放，请重新上传或更换音频文件。")}
            />
            <span>{currentLineAudio?.fileName ?? "当前句未绑定音频"}</span>
            <span>{formatTime(audioTime)} / {formatTime(currentLineAudio?.duration)}</span>
          </div>
        ) : currentAudio?.filePath ? (
          <div className="audio-player-row">
            <audio
              ref={audioRef}
              src={currentAudio.filePath}
              controls
              preload="metadata"
              onError={() => setPlaybackError("音频文件无法播放，请重新上传或更换音频文件。")}
            />
            <span>{currentAudio.fileName}</span>
            <span>
              {formatTime(audioTime)} / {formatTime(currentAudio.duration)}
            </span>
            <button type="button" className="ghost-button" onClick={regenerateSubtitleTimeline}>
              重新生成字幕时间轴
            </button>
          </div>
        ) : (
          <span className="muted-text">当前项目未上传音频，请先上传音频后再使用音频同步播放。</span>
        )}
        {currentAudio?.subtitles && currentAudio.subtitles.length > 0 && !hasOrderedAudio && (
          <details className="subtitle-editor">
            <summary>字幕时间轴编辑</summary>
            <div className="subtitle-grid">
              {currentAudio.subtitles.map((segment) => (
                <div className="subtitle-row" key={segment.id}>
                  <span>{segment.text.slice(0, 26)}</span>
                  <input value={segment.startTime} onChange={(event) => updateSegment(segment, "startTime", event.target.value)} aria-label="开始时间" />
                  <input value={segment.endTime} onChange={(event) => updateSegment(segment, "endTime", event.target.value)} aria-label="结束时间" />
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <PlaybackControls
        status={playbackStatus}
        speed={project.playback.speed}
        autoScroll={project.playback.autoScroll}
        onPlay={play}
        onPause={pause}
        onNext={goNext}
        onPrev={goPrevious}
        onRestart={restart}
        onSpeedChange={(speed: PlaybackSpeed) => setPlaybackSpeed(speed)}
        onAutoScrollChange={setAutoScroll}
      />

      {exportOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="导出项目">
          <section className="export-modal">
            <h2>导出项目</h2>
            <button type="button" className="ghost-button" onClick={() => exportFile("txt")}>
              导出 TXT
            </button>
            <button type="button" className="ghost-button" onClick={() => exportFile("md")}>
              导出 Markdown
            </button>
            <button type="button" className="ghost-button" onClick={() => exportFile("json")}>
              导出 JSON
            </button>
            <button type="button" className="link-button" onClick={() => setExportOpen(false)}>
              取消
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
