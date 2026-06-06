import { create } from "zustand";
import type {
  Actor,
  ActorPosition,
  AppView,
  BackgroundSettings,
  BubbleStyle,
  CanvasAspectRatio,
  FontSettings,
  ParsedLine,
  ParseResult,
  PlaybackSpeed,
  PlaybackStatus,
  Project,
  ProjectTheme,
  RecentProject,
  ScriptLine,
  SubtitleSegment,
  TranscriptionStatus,
} from "../types/project";
import { parseScript } from "../utils/parseScript";
import { getRecentProjects, saveProject } from "../utils/fileStorage";
import { transcribeAudio } from "../services/transcriptionService";
import { readAudioDuration, readFileAsDataUrl, validateAudioFile } from "../utils/assetStorage";
import { migrateProjectToLatest } from "../utils/migrateProject";
import { generateEstimatedSubtitleTimeline, validateSubtitleTimeline } from "../utils/subtitleTimeline";

interface ProjectStore {
  view: AppView;
  projectName: string;
  rawScript: string;
  parseResult?: ParseResult;
  project?: Project;
  currentIndex: number;
  playbackStatus: PlaybackStatus;
  lastMessage: string;
  errorMessage: string;
  recents: RecentProject[];
  transcriptionStatus: TranscriptionStatus;
  transcriptionFileName: string;
  pendingAudioSource?: {
    fileName: string;
    filePath: string;
    duration?: number;
    transcriptionText?: string;
  };
  setView: (view: AppView) => void;
  setProjectName: (name: string) => void;
  setRawScript: (script: string) => void;
  startNewProject: () => void;
  validateAndGoToImport: () => boolean;
  parseCurrentScript: () => boolean;
  transcribeCurrentAudio: (file?: File) => Promise<boolean>;
  confirmTranscriptionText: (text: string) => boolean;
  updateActor: (actorId: string, changes: Partial<Actor>) => void;
  updateActorBubbleStyle: (actorId: string, changes: Partial<BubbleStyle>) => void;
  setActorPosition: (actorId: string, position: ActorPosition) => void;
  updateTheme: (theme: Partial<ProjectTheme>) => void;
  updateBackground: (changes: Partial<BackgroundSettings>) => void;
  updateFonts: (changes: Partial<FontSettings>) => void;
  updateCanvasAspectRatio: (aspectRatio: CanvasAspectRatio) => void;
  finishActorSetup: () => boolean;
  setProject: (project: Project) => void;
  saveCurrentProject: () => Promise<void>;
  refreshRecents: () => void;
  setCurrentIndex: (index: number) => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setPlaybackMode: (mode: "text" | "audio") => void;
  setAutoScroll: (enabled: boolean) => void;
  regenerateSubtitleTimeline: () => void;
  updateSubtitleSegment: (audioId: string, segmentId: string, changes: Partial<SubtitleSegment>) => void;
  updateLineText: (lineId: string, text: string) => void;
  switchLineActor: (lineId: string) => void;
  deleteLine: (lineId: string) => void;
  addLine: (lineId: string, placement: "above" | "below") => string;
  duplicateLine: (lineId: string) => string;
}

const invalidFilenameCharacters = /[<>:"/\\|?*]/;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now(): string {
  return new Date().toISOString();
}

function createBubbleStyle(backgroundColor: string, textColor = "#1f2937"): BubbleStyle {
  return {
    backgroundColor,
    textColor,
    borderRadius: 8,
    paddingX: 14,
    paddingY: 12,
    backgroundImageMode: "cover",
  };
}

function createDefaultTheme(): ProjectTheme {
  return {
    background: createDefaultBackground(),
    fonts: {},
    canvas: { aspectRatio: "9:16" },
  };
}

function createDefaultBackground(): BackgroundSettings {
  return {
    fit: "cover",
    opacity: 100,
    blur: 0,
  };
}

function createActors(actorNames: string[]): Actor[] {
  return [
    {
      id: id("actor"),
      name: actorNames[0],
      avatarPath: "",
      position: "left",
      bubbleColor: "#dbeafe",
      textColor: "#1f2937",
      bubbleStyle: createBubbleStyle("#dbeafe"),
    },
    {
      id: id("actor"),
      name: actorNames[1],
      avatarPath: "",
      position: "right",
      bubbleColor: "#f1f5f9",
      textColor: "#1f2937",
      bubbleStyle: createBubbleStyle("#f1f5f9"),
    },
  ];
}

function createLines(parsedLines: ParsedLine[], actors: Actor[]): ScriptLine[] {
  return parsedLines.map((line, index) => {
    const speaker = actors.find((actor) => actor.name === line.speakerName) ?? actors[0];
    return {
      id: id("line"),
      speakerId: speaker.id,
      text: line.text,
      type: "dialogue",
      order: index + 1,
      createdAt: now(),
      updatedAt: now(),
    };
  });
}

function reorder(lines: ScriptLine[]): ScriptLine[] {
  return lines.map((line, index) => ({ ...line, order: index + 1, updatedAt: now() }));
}

function withProjectUpdate(project: Project, updater: (project: Project) => Project): Project {
  return { ...updater(project), updatedAt: now() };
}

function normalizeProject(project: Project): Project {
  const migrated = migrateProjectToLatest(project);
  const normalizedActors = migrated.actors.map((actor) => {
    const bubbleStyle = actor.bubbleStyle ?? createBubbleStyle(actor.bubbleColor, actor.textColor);
    return {
      ...actor,
      bubbleColor: actor.bubbleColor ?? bubbleStyle.backgroundColor,
      textColor: actor.textColor ?? bubbleStyle.textColor,
      bubbleStyle,
    };
  });

  return {
    ...migrated,
    actors: normalizedActors,
    theme: {
      ...createDefaultTheme(),
      ...(migrated.theme ?? {}),
      background: {
        ...createDefaultBackground(),
        ...(migrated.theme?.background ?? {}),
      },
      fonts: {
        ...(migrated.theme?.fonts ?? {}),
      },
      canvas: {
        aspectRatio: migrated.theme?.canvas?.aspectRatio ?? "9:16",
      },
    },
    audioSources: migrated.audioSources ?? [],
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  view: "home",
  projectName: "",
  rawScript: "",
  currentIndex: -1,
  playbackStatus: "idle",
  lastMessage: "",
  errorMessage: "",
  transcriptionStatus: "idle",
  transcriptionFileName: "",
  pendingAudioSource: undefined,
  recents: getRecentProjects(),

  setView: (view) => set({ view, errorMessage: "", lastMessage: "" }),
  setProjectName: (projectName) => set({ projectName }),
  setRawScript: (rawScript) => set({ rawScript }),
  startNewProject: () =>
    set({
      view: "new-project",
      projectName: "",
      rawScript: "",
      parseResult: undefined,
      project: undefined,
      currentIndex: -1,
      playbackStatus: "idle",
      transcriptionStatus: "idle",
      transcriptionFileName: "",
      pendingAudioSource: undefined,
      errorMessage: "",
      lastMessage: "",
    }),
  validateAndGoToImport: () => {
    const name = get().projectName.trim();
    if (!name) {
      set({ errorMessage: "请输入项目名称。" });
      return false;
    }
    if (name.length > 50) {
      set({ errorMessage: "项目名称最多 50 个字符。" });
      return false;
    }
    if (invalidFilenameCharacters.test(name)) {
      set({ errorMessage: "项目名称不能包含系统非法文件名字符。" });
      return false;
    }
    set({ view: "import-script", errorMessage: "" });
    return true;
  },
  parseCurrentScript: () => {
    const rawScript = get().rawScript.trim();
    if (!rawScript) {
      set({ errorMessage: "剧本内容不能为空。" });
      return false;
    }

    const result = parseScript(rawScript);
    if (!result.success) {
      set({ parseResult: result, errorMessage: result.errors.join(" ") });
      return false;
    }

    const actors = createActors(result.actors);
    const createdAt = now();
    const lines = createLines(result.lines, actors);
    const pendingAudio = get().pendingAudioSource;
    const audioSources = pendingAudio
      ? [
          {
            id: id("audio"),
            fileName: pendingAudio.fileName,
            filePath: pendingAudio.filePath,
            duration: pendingAudio.duration,
            importedAt: now(),
            transcriptionText: pendingAudio.transcriptionText ?? rawScript,
            transcriptionStatus: "success" as const,
            subtitles: pendingAudio.duration
              ? generateEstimatedSubtitleTimeline(lines, actors, pendingAudio.duration)
              : [],
          },
        ]
      : [];
    const project: Project = {
      id: id("project"),
      name: get().projectName.trim(),
      createdAt,
      updatedAt: createdAt,
      originalScript: rawScript,
      actors,
      lines,
      playback: {
        speed: 1,
        autoScroll: true,
        mode: audioSources.length > 0 && audioSources[0].duration ? "audio" : "text",
        currentAudioId: audioSources[0]?.id,
      },
      theme: createDefaultTheme(),
      audioSources,
    };

    set({
      parseResult: result,
      project,
      view: "actor-setup",
      currentIndex: 0,
      pendingAudioSource: undefined,
      errorMessage: "",
      lastMessage: `检测到 2 个角色，${result.lines.length} 条台词。`,
    });
    return true;
  },
  transcribeCurrentAudio: async (file) => {
    const errors = validateAudioFile(file);
    if (errors.length > 0) {
      set({ errorMessage: errors.join(" "), transcriptionStatus: "failed" });
      return false;
    }
    if (!file) return false;

    let filePath: string;
    let duration: number | undefined;
    try {
      filePath = await readFileAsDataUrl(file);
      duration = await readAudioDuration(filePath);
    } catch {
      filePath = await readFileAsDataUrl(file);
      set({ lastMessage: "未能读取音频时长，已保留文字播放模式。" });
    }

    set({
      transcriptionStatus: "uploading",
      transcriptionFileName: file.name,
      errorMessage: "",
      lastMessage: "正在读取音频文件...",
    });

    set({ transcriptionStatus: "transcribing", lastMessage: "正在识别音频..." });
    const result = await transcribeAudio(file, { mode: "mock", language: "auto" });
    if (!result.success) {
      set({ transcriptionStatus: "failed", errorMessage: result.errors.join(" ") });
      return false;
    }

    set({
      rawScript: result.fullText,
      transcriptionStatus: "success",
      pendingAudioSource: {
        fileName: file.name,
        filePath,
        duration,
        transcriptionText: result.fullText,
      },
      view: "transcription-review",
      lastMessage: "识别完成，当前为 mock 转写结果。",
      errorMessage: "",
    });
    return true;
  },
  confirmTranscriptionText: (text) => {
    set({ rawScript: text });
    return get().parseCurrentScript();
  },
  updateActor: (actorId, changes) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        actors: current.actors.map((actor) => (actor.id === actorId ? { ...actor, ...changes } : actor)),
      })),
    });
  },
  updateActorBubbleStyle: (actorId, changes) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        actors: current.actors.map((actor) => {
          if (actor.id !== actorId) return actor;
          const bubbleStyle = { ...actor.bubbleStyle, ...changes };
          return {
            ...actor,
            bubbleStyle,
            bubbleColor: bubbleStyle.backgroundColor,
            textColor: bubbleStyle.textColor,
          };
        }),
      })),
    });
  },
  setActorPosition: (actorId, position) => {
    const project = get().project;
    if (!project) return;
    const otherPosition: ActorPosition = position === "left" ? "right" : "left";
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        actors: current.actors.map((actor) => ({
          ...actor,
          position: actor.id === actorId ? position : otherPosition,
        })),
      })),
    });
  },
  updateTheme: (theme) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        theme: { ...current.theme, ...theme },
      })),
    });
  },
  updateBackground: (changes) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        theme: {
          ...current.theme,
          background: {
            ...createDefaultBackground(),
            ...(current.theme.background ?? {}),
            ...changes,
          },
        },
      })),
    });
  },
  updateFonts: (changes) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        theme: {
          ...current.theme,
          fonts: {
            ...(current.theme.fonts ?? {}),
            ...changes,
          },
        },
      })),
    });
  },
  updateCanvasAspectRatio: (aspectRatio) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        theme: {
          ...current.theme,
          canvas: { aspectRatio },
        },
      })),
    });
  },
  finishActorSetup: () => {
    const project = get().project;
    if (!project) return false;
    const [first, second] = project.actors;
    if (!first.name.trim() || !second.name.trim()) {
      set({ errorMessage: "角色名称不能为空。" });
      return false;
    }
    if (first.name.trim() === second.name.trim()) {
      set({ errorMessage: "两个角色名称不能完全相同。" });
      return false;
    }
    if (first.name.length > 30 || second.name.length > 30) {
      set({ errorMessage: "角色名称最多 30 个字符。" });
      return false;
    }
    set({ view: "player", errorMessage: "", lastMessage: "" });
    void get().saveCurrentProject();
    return true;
  },
  setProject: (project) =>
    set({
      project: normalizeProject(project),
      projectName: project.name,
      rawScript: project.originalScript,
      view: "player",
      currentIndex: project.playback.currentLineId
        ? Math.max(0, project.lines.findIndex((line) => line.id === project.playback.currentLineId))
        : 0,
      playbackStatus: "idle",
      errorMessage: "",
      lastMessage: "项目已打开。",
    }),
  saveCurrentProject: async () => {
    const project = get().project;
    if (!project) return;
    await saveProject(normalizeProject(project));
    set({ lastMessage: "已保存", errorMessage: "", recents: getRecentProjects() });
  },
  refreshRecents: () => set({ recents: getRecentProjects() }),
  setCurrentIndex: (currentIndex) => {
    const project = get().project;
    if (!project) {
      set({ currentIndex });
      return;
    }
    const line = project.lines[currentIndex];
    set({
      currentIndex,
      project: {
        ...project,
        playback: { ...project.playback, currentLineId: line?.id },
      },
    });
  },
  setPlaybackStatus: (playbackStatus) => set({ playbackStatus }),
  setPlaybackSpeed: (speed) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, playback: { ...project.playback, speed } } });
  },
  setPlaybackMode: (mode) => {
    const project = get().project;
    if (!project) return;
    const currentAudio =
      project.audioSources?.find((audio) => audio.id === project.playback.currentAudioId) ?? project.audioSources?.[0];
    if (mode === "audio" && !currentAudio?.filePath) {
      set({ errorMessage: "当前项目未上传音频，请先上传音频后再使用音频同步播放。" });
      return;
    }
    set({
      errorMessage: "",
      project: {
        ...project,
        playback: { ...project.playback, mode, currentAudioId: currentAudio?.id ?? project.playback.currentAudioId },
      },
    });
  },
  setAutoScroll: (autoScroll) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, playback: { ...project.playback, autoScroll } } });
  },
  regenerateSubtitleTimeline: () => {
    const project = get().project;
    if (!project) return;
    const currentAudioId = project.playback.currentAudioId ?? project.audioSources?.[0]?.id;
    const audio = project.audioSources?.find((item) => item.id === currentAudioId);
    if (!audio?.duration) {
      set({ errorMessage: "未能读取音频时长，已切换为文字播放模式。" });
      get().setPlaybackMode("text");
      return;
    }
    const subtitles = generateEstimatedSubtitleTimeline(project.lines, project.actors, audio.duration);
    set({
      errorMessage: "",
      lastMessage: "已重新生成字幕时间轴。",
      project: withProjectUpdate(project, (current) => ({
        ...current,
        audioSources: current.audioSources?.map((item) => (item.id === audio.id ? { ...item, subtitles } : item)),
        playback: { ...current.playback, mode: "audio", currentAudioId: audio.id },
      })),
    });
  },
  updateSubtitleSegment: (audioId, segmentId, changes) => {
    const project = get().project;
    if (!project) return;
    const nextProject = withProjectUpdate(project, (current) => ({
      ...current,
      audioSources: current.audioSources?.map((audio) =>
        audio.id === audioId
          ? {
              ...audio,
              subtitles: audio.subtitles?.map((segment) =>
                segment.id === segmentId ? { ...segment, ...changes } : segment,
              ),
            }
          : audio,
      ),
    }));
    const audio = nextProject.audioSources?.find((item) => item.id === audioId);
    const errors = validateSubtitleTimeline(audio?.subtitles ?? [], audio?.duration);
    set({
      project: nextProject,
      errorMessage: errors.join(" "),
    });
  },
  updateLineText: (lineId, text) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        lines: current.lines.map((line) => (line.id === lineId ? { ...line, text, updatedAt: now() } : line)),
      })),
      lastMessage:
        project.playback.mode === "audio"
          ? "台词内容已修改，建议重新生成字幕时间轴。"
          : get().lastMessage,
    });
  },
  switchLineActor: (lineId) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        lines: current.lines.map((line) =>
          line.id === lineId
            ? {
                ...line,
                speakerId: current.actors.find((actor) => actor.id !== line.speakerId)?.id ?? line.speakerId,
                updatedAt: now(),
              }
            : line,
        ),
      })),
    });
  },
  deleteLine: (lineId) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        lines: reorder(current.lines.filter((line) => line.id !== lineId)),
      })),
      currentIndex: Math.max(0, Math.min(get().currentIndex, project.lines.length - 2)),
    });
  },
  addLine: (lineId, placement) => {
    const project = get().project;
    if (!project) return "";
    const targetIndex = project.lines.findIndex((line) => line.id === lineId);
    if (targetIndex === -1) return "";
    const newLine: ScriptLine = {
      id: id("line"),
      speakerId: project.lines[targetIndex].speakerId,
      text: "",
      type: "dialogue",
      order: targetIndex + (placement === "below" ? 2 : 1),
      createdAt: now(),
      updatedAt: now(),
    };
    const nextLines = [...project.lines];
    nextLines.splice(placement === "below" ? targetIndex + 1 : targetIndex, 0, newLine);
    set({ project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder(nextLines) })) });
    return newLine.id;
  },
  duplicateLine: (lineId) => {
    const project = get().project;
    if (!project) return "";
    const targetIndex = project.lines.findIndex((line) => line.id === lineId);
    if (targetIndex === -1) return "";
    const newLine: ScriptLine = {
      ...project.lines[targetIndex],
      id: id("line"),
      createdAt: now(),
      updatedAt: now(),
    };
    const nextLines = [...project.lines];
    nextLines.splice(targetIndex + 1, 0, newLine);
    set({ project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder(nextLines) })) });
    return newLine.id;
  },
}));
