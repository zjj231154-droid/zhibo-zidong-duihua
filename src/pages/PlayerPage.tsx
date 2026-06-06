import { useEffect, useRef, useState } from "react";
import { ChatBubble } from "../components/ChatBubble";
import { PlaybackControls } from "../components/PlaybackControls";
import { ProjectHeader } from "../components/ProjectHeader";
import { ScriptLineEditor } from "../components/ScriptLineEditor";
import { useProjectStore } from "../store/projectStore";
import type { BackgroundFit, PlaybackSpeed } from "../types/project";
import {
  downloadTextFile,
  exportProjectAsJson,
  exportProjectAsMarkdown,
  exportProjectAsTxt,
} from "../utils/exportProject";
import { applyFontSettings } from "../utils/fontLoader";
import { getLineDuration } from "../utils/playbackTime";

function backgroundSizing(fit?: BackgroundFit) {
  if (fit === "contain") return { backgroundSize: "contain", backgroundRepeat: "no-repeat" };
  if (fit === "repeat") return { backgroundSize: "auto", backgroundRepeat: "repeat" };
  if (fit === "center") return { backgroundSize: "auto", backgroundRepeat: "no-repeat" };
  return { backgroundSize: "cover", backgroundRepeat: "no-repeat" };
}

export function PlayerPage() {
  const {
    project,
    currentIndex,
    playbackStatus,
    lastMessage,
    setView,
    saveCurrentProject,
    setCurrentIndex,
    setPlaybackStatus,
    setPlaybackSpeed,
    setAutoScroll,
    updateLineText,
    switchLineActor,
    deleteLine,
    addLine,
    duplicateLine,
  } = useProjectStore();
  const [editingLineId, setEditingLineId] = useState<string>("");
  const [exportOpen, setExportOpen] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    applyFontSettings(project?.theme.fonts);
  }, [project?.theme.fonts]);

  useEffect(() => {
    if (!project || playbackStatus !== "playing") return;
    const currentLine = project.lines[currentIndex];
    if (!currentLine) {
      setPlaybackStatus("ended");
      return;
    }

    if (!currentLine.text.trim()) {
      const nextIndex = project.lines.findIndex((line, index) => index > currentIndex && line.text.trim());
      if (nextIndex === -1) setPlaybackStatus("ended");
      else setCurrentIndex(nextIndex);
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
    if (!project?.playback.autoScroll) return;
    const line = project.lines[currentIndex];
    if (!line) return;
    document.getElementById(`line-${line.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentIndex, project?.playback.autoScroll, project?.lines]);

  if (!project) return null;
  const activeProject = project;
  const background = activeProject.theme.background;
  const backgroundStyle = backgroundSizing(background?.fit);

  function nextPlayableIndex(fromIndex: number): number {
    for (let index = fromIndex + 1; index < activeProject.lines.length; index += 1) {
      if (activeProject.lines[index].text.trim()) return index;
    }
    return -1;
  }

  function previousPlayableIndex(fromIndex: number): number {
    for (let index = fromIndex - 1; index >= 0; index -= 1) {
      if (activeProject.lines[index].text.trim()) return index;
    }
    return -1;
  }

  function goNext() {
    const nextIndex = nextPlayableIndex(currentIndex);
    if (nextIndex === -1) setPlaybackStatus("ended");
    else setCurrentIndex(nextIndex);
  }

  function goPrevious() {
    const previousIndex = previousPlayableIndex(currentIndex);
    if (previousIndex !== -1) setCurrentIndex(previousIndex);
  }

  function play() {
    if (activeProject.lines.length === 0) return;
    if (currentIndex < 0 || playbackStatus === "ended") {
      const first = activeProject.lines.findIndex((line) => line.text.trim());
      setCurrentIndex(first === -1 ? 0 : first);
    }
    setPlaybackStatus("playing");
  }

  function restart() {
    const first = activeProject.lines.findIndex((line) => line.text.trim());
    setCurrentIndex(first === -1 ? 0 : first);
    setPlaybackStatus("idle");
  }

  function exportFile(format: "txt" | "md" | "json") {
    const safeName = activeProject.name.replace(/[<>:"/\\|?*]/g, "_");
    if (format === "txt") downloadTextFile(exportProjectAsTxt(activeProject), `${safeName}.txt`, "text/plain");
    if (format === "md") downloadTextFile(exportProjectAsMarkdown(activeProject), `${safeName}.md`, "text/markdown");
    if (format === "json") downloadTextFile(exportProjectAsJson(activeProject), `${safeName}.json`, "application/json");
    setExportOpen(false);
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
        {lastMessage && <strong>{lastMessage}</strong>}
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
      </section>
      <PlaybackControls
        status={playbackStatus}
        speed={project.playback.speed}
        autoScroll={project.playback.autoScroll}
        onPlay={play}
        onPause={() => setPlaybackStatus("paused")}
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
