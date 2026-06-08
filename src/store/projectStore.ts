import { create } from "zustand";
import type {
  Actor,
  ActorPosition,
  AppView,
  AudioAsset,
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
import { TRANSCRIPTION_PROMPT, transcribeAudio } from "../services/transcriptionService";
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
  validateAndGoToAudioTranscription: () => boolean;
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
  uploadActorAudioAssets: (actorId: string, files: File[]) => Promise<boolean>;
  transcribeAudioAsset: (audioId: string) => Promise<boolean>;
  transcribeAllAudioAssets: () => Promise<boolean>;
  updateAudioAssetTranscription: (audioId: string, text: string) => void;
  useRawTranscriptionText: (audioId: string) => void;
  deleteAudioAsset: (audioId: string) => void;
  generateDialogueFromAudioAssets: () => boolean;
  addAudioAssetToDialogue: (audioId: string) => string;
  bindLineAudio: (lineId: string, audioId?: string) => void;
  moveLine: (lineId: string, direction: "up" | "down") => void;
  reorderLineTo: (lineId: string, targetIndex: number) => void;
  sortDialogueLines: (mode: "fileName" | "uploadTime" | "alternateActors") => void;
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

function createActors(): Actor[] {
  return [
    {
      id: "walulu",
      name: "Walulu",
      avatarPath: "",
      position: "left",
      bubbleColor: "#dbeafe",
      textColor: "#1f2937",
      bubbleStyle: createBubbleStyle("#dbeafe"),
      isDefault: true,
    },
    {
      id: "fufu",
      name: "Fufu福福",
      avatarPath: "",
      position: "right",
      bubbleColor: "#f1f5f9",
      textColor: "#1f2937",
      bubbleStyle: createBubbleStyle("#f1f5f9"),
      isDefault: true,
    },
  ];
}

function createLines(parsedLines: ParsedLine[], actors: Actor[], parsedActors: string[]): ScriptLine[] {
  return parsedLines.map((line, index) => {
    const parsedActorIndex = parsedActors.findIndex((name) => name === line.speakerName);
    const speaker = actors.find((actor) => actor.name === line.speakerName) ?? actors[parsedActorIndex] ?? actors[0];
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

function sortAudioFiles(files: File[]): File[] {
  return [...files].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: "base" }),
  );
}

function detectOrderFromFileName(fileName: string, fallback: number): number {
  const match = fileName.match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

function normalizeTranscriptionText(text: string, fallbackActorName: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const firstLine = trimmed.split(/\r?\n/).find(Boolean) ?? trimmed;
  const colonIndex = firstLine.search(/[：:]/);
  if (colonIndex >= 0) return firstLine.slice(colonIndex + 1).trim() || firstLine.trim();
  return firstLine.replace(new RegExp(`^${fallbackActorName}\\s*`), "").trim();
}

function getFinalTranscriptionText(audio: AudioAsset): string {
  if (audio.isEdited && audio.editedText?.trim()) return audio.editedText.trim();
  if (audio.rawTranscriptionText?.trim()) return audio.rawTranscriptionText.trim();
  if (audio.finalText?.trim()) return audio.finalText.trim();
  if (audio.transcriptionText?.trim()) return audio.transcriptionText.trim();
  return "[未识别文字]";
}

function withFinalTranscription(audio: AudioAsset): AudioAsset {
  const finalText = getFinalTranscriptionText(audio);
  return {
    ...audio,
    finalText,
    transcriptionText: finalText === "[未识别文字]" ? "" : finalText,
  };
}

function syncLinesWithAudio(lines: ScriptLine[], audio: AudioAsset): ScriptLine[] {
  const finalText = getFinalTranscriptionText(audio);
  return lines.map((line) =>
    line.audioId === audio.id ? { ...line, text: finalText, isEdited: audio.isEdited, updatedAt: now() } : line,
  );
}

function sortAudioByFileNameNumber(audioList: AudioAsset[]): AudioAsset[] {
  return [...audioList].sort((first, second) => {
    const firstOrder = detectOrderFromFileName(first.fileName, Number.MAX_SAFE_INTEGER);
    const secondOrder = detectOrderFromFileName(second.fileName, Number.MAX_SAFE_INTEGER);
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return (first.uploadOrder ?? 0) - (second.uploadOrder ?? 0);
  });
}

async function createAudioAsset(actorId: string, file: File, uploadOrder: number): Promise<AudioAsset> {
  const filePath = await readFileAsDataUrl(file);
  let duration: number | undefined;
  try {
    duration = await readAudioDuration(filePath);
  } catch {
    duration = undefined;
  }
  return {
    id: id("audio"),
    actorId,
    fileName: file.name,
    filePath,
    fileType: file.name.toLowerCase().split(".").pop() ?? "",
    fileSize: file.size,
    duration,
    language: "zh-CN",
    rawTranscriptionText: "",
    editedText: "",
    finalText: "",
    isEdited: false,
    uploadOrder,
    detectedOrder: detectOrderFromFileName(file.name, uploadOrder),
    transcriptionStatus: "pending",
    transcriptionProvider: "",
    transcriptionText: "",
    importedAt: now(),
  };
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
    audioAssets: (migrated.audioAssets ?? []).map((audio, index) => {
      const rawTranscriptionText = audio.rawTranscriptionText ?? audio.transcriptionText ?? "";
      return withFinalTranscription({
        ...audio,
        fileType: audio.fileType ?? audio.fileName.toLowerCase().split(".").pop() ?? "",
        fileSize: audio.fileSize,
        language: audio.language ?? "zh-CN",
        rawTranscriptionText,
        editedText: audio.editedText ?? "",
        finalText: audio.finalText ?? "",
        isEdited: audio.isEdited ?? false,
        uploadOrder: audio.uploadOrder ?? index + 1,
        detectedOrder: audio.detectedOrder ?? detectOrderFromFileName(audio.fileName, index + 1),
        transcriptionStatus:
          audio.transcriptionStatus ?? (rawTranscriptionText || audio.finalText || audio.transcriptionText ? "completed" : "pending"),
        transcriptionProvider: audio.transcriptionProvider ?? "",
        transcriptionText: audio.transcriptionText ?? "",
      });
    }),
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
  validateAndGoToAudioTranscription: () => {
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
    const createdAt = now();
    const project: Project = {
      id: id("project"),
      name,
      createdAt,
      updatedAt: createdAt,
      originalScript: "",
      actors: createActors(),
      lines: [],
      playback: {
        speed: 1,
        autoScroll: true,
        mode: "audio",
      },
      theme: createDefaultTheme(),
      audioSources: [],
      audioAssets: [],
    };
    set({
      project,
      view: "audio-transcription",
      currentIndex: 0,
      playbackStatus: "idle",
      errorMessage: "",
      lastMessage: "已创建音频识别项目。",
    });
    void get().saveCurrentProject();
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

    const actors = createActors();
    const createdAt = now();
    const lines = createLines(result.lines, actors, result.actors);
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
      audioAssets: audioSources.map((audio) => ({
        id: audio.id,
        actorId: lines[0]?.speakerId ?? actors[0].id,
        fileName: audio.fileName,
        filePath: audio.filePath ?? "",
        duration: audio.duration,
        importedAt: audio.importedAt,
      })),
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
    const result = await transcribeAudio(file, { mode: "mock", language: "zh-CN", prompt: TRANSCRIPTION_PROMPT });
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
    const hasLineAudio = project.lines.some((line) =>
      project.audioAssets?.some((audio) => audio.id === line.audioId && audio.filePath),
    );
    if (mode === "audio" && !currentAudio?.filePath && !hasLineAudio) {
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
  uploadActorAudioAssets: async (actorId, files) => {
    const project = get().project;
    if (!project || files.length === 0) return false;
    if (files.length > 50) {
      set({ errorMessage: "一次最多上传 50 个音频文件。" });
      return false;
    }
    const sortedFiles = sortAudioFiles(files);
    const errors = sortedFiles.flatMap((file) => validateAudioFile(file));
    if (errors.length > 0) {
      set({ errorMessage: Array.from(new Set(errors)).join(" ") });
      return false;
    }
    const currentMaxOrder = Math.max(0, ...(project.audioAssets ?? []).map((audio) => audio.uploadOrder ?? 0));
    const assets = await Promise.all(
      sortedFiles.map((file, index) => createAudioAsset(actorId, file, currentMaxOrder + index + 1)),
    );
    set({
      errorMessage: "",
      lastMessage: `已上传 ${assets.length} 个角色音频。`,
      project: withProjectUpdate(project, (current) => ({
        ...current,
        audioAssets: [...(current.audioAssets ?? []), ...assets],
      })),
    });
    return true;
  },
  transcribeAudioAsset: async (audioId) => {
    const project = get().project;
    const audio = project?.audioAssets?.find((item) => item.id === audioId);
    if (!project || !audio) return false;
    if (
      audio.isEdited &&
      !confirm(
        "当前文字已经被手动修改。重新识别会更新模型原始识别结果，但不会自动覆盖你手动修改的文字。是否继续？",
      )
    ) {
      return false;
    }
    if (!audio.filePath) {
      set({
        errorMessage: "文件丢失，请重新上传音频。",
        project: withProjectUpdate(project, (current) => ({
          ...current,
          audioAssets: (current.audioAssets ?? []).map((item) =>
            item.id === audioId
              ? { ...item, transcriptionStatus: "missing", transcriptionError: "文件丢失，请重新上传音频。" }
              : item,
          ),
        })),
      });
      return false;
    }

    set({
      errorMessage: "",
      lastMessage: `正在识别 ${audio.fileName}...`,
      project: withProjectUpdate(project, (current) => ({
        ...current,
        audioAssets: (current.audioAssets ?? []).map((item) =>
          item.id === audioId ? { ...item, transcriptionStatus: "transcribing", transcriptionError: "" } : item,
        ),
      })),
    });

    try {
      const response = await fetch(audio.filePath);
      const blob = await response.blob();
      const file = new File([blob], audio.fileName, { type: blob.type || `audio/${audio.fileType ?? "mpeg"}` });
      const result = await transcribeAudio(file, { mode: "mock", language: "zh-CN", prompt: TRANSCRIPTION_PROMPT });
      const latestProject = get().project;
      const latestAudio = latestProject?.audioAssets?.find((item) => item.id === audioId);
      const actor = latestProject?.actors.find((item) => item.id === latestAudio?.actorId);
      if (!latestProject || !latestAudio) return false;
      if (!result.success) {
        set({
          errorMessage: result.errors.join(" "),
          project: withProjectUpdate(latestProject, (current) => ({
            ...current,
            audioAssets: (current.audioAssets ?? []).map((item) =>
              item.id === audioId
                ? withFinalTranscription({
                    ...item,
                    language: result.language,
                    rawTranscriptionText: result.fullText,
                    transcriptionStatus: "failed",
                    transcriptionProvider: result.provider,
                    transcriptionError: result.errors.join(" "),
                  })
                : item,
            ),
          })),
        });
        return false;
      }
      const transcriptionText = normalizeTranscriptionText(result.fullText, actor?.name ?? "");
      const nextAudio = withFinalTranscription({
        ...latestAudio,
        language: result.language,
        rawTranscriptionText: transcriptionText,
        finalText: latestAudio.isEdited ? latestAudio.finalText : transcriptionText,
        transcriptionStatus: transcriptionText ? "completed" : "failed",
        transcriptionProvider: result.provider,
        transcriptionError: transcriptionText ? "" : "未识别到有效人声，请检查音频内容是否清晰。",
      });
      set({
        errorMessage: nextAudio.transcriptionError || "",
        lastMessage: nextAudio.transcriptionStatus === "completed" ? `${audio.fileName} 识别完成。` : `${audio.fileName} 识别失败。`,
        project: withProjectUpdate(latestProject, (current) => ({
          ...current,
          audioAssets: (current.audioAssets ?? []).map((item) => (item.id === audioId ? nextAudio : item)),
          lines: syncLinesWithAudio(current.lines, nextAudio),
        })),
      });
      return nextAudio.transcriptionStatus === "completed";
    } catch {
      const latestProject = get().project;
      if (!latestProject) return false;
      set({
        errorMessage: "该音频识别失败，请检查音频是否清晰，或尝试转换为 mp3 / wav 格式后重新上传。",
        project: withProjectUpdate(latestProject, (current) => ({
          ...current,
          audioAssets: (current.audioAssets ?? []).map((item) =>
            item.id === audioId
              ? {
                  ...item,
                  transcriptionStatus: "failed",
                  transcriptionError: "该音频识别失败，请检查音频是否清晰，或尝试转换为 mp3 / wav 格式后重新上传。",
                }
              : item,
          ),
        })),
      });
      return false;
    }
  },
  transcribeAllAudioAssets: async () => {
    const project = get().project;
    const pendingAssets = (project?.audioAssets ?? []).filter(
      (audio) => audio.transcriptionStatus !== "completed" && audio.transcriptionStatus !== "unsupported",
    );
    if (!project || pendingAssets.length === 0) {
      set({ lastMessage: "没有需要识别的音频。" });
      return false;
    }
    let successCount = 0;
    for (const audio of pendingAssets) {
      if (await get().transcribeAudioAsset(audio.id)) successCount += 1;
    }
    set({ lastMessage: `批量识别完成：${successCount} / ${pendingAssets.length} 个音频成功。` });
    return successCount > 0;
  },
  updateAudioAssetTranscription: (audioId, text) => {
    const project = get().project;
    if (!project) return;
    const currentAudio = project.audioAssets?.find((audio) => audio.id === audioId);
    if (!currentAudio) return;
    const nextAudio = withFinalTranscription({
      ...currentAudio,
      editedText: text,
      finalText: text.trim() || "[未识别文字]",
      isEdited: true,
      transcriptionStatus: text.trim() ? "edited" : "pending",
      transcriptionError: "",
    });
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        audioAssets: (current.audioAssets ?? []).map((audio) => (audio.id === audioId ? nextAudio : audio)),
        lines: syncLinesWithAudio(current.lines, nextAudio),
      })),
    });
  },
  useRawTranscriptionText: (audioId) => {
    const project = get().project;
    if (!project) return;
    const currentAudio = project.audioAssets?.find((audio) => audio.id === audioId);
    if (!currentAudio) return;
    const nextAudio = withFinalTranscription({
      ...currentAudio,
      editedText: "",
      isEdited: false,
      finalText: currentAudio.rawTranscriptionText ?? "",
      transcriptionStatus: currentAudio.rawTranscriptionText?.trim() ? "completed" : "pending",
      transcriptionError: "",
    });
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        audioAssets: (current.audioAssets ?? []).map((audio) => (audio.id === audioId ? nextAudio : audio)),
        lines: syncLinesWithAudio(current.lines, nextAudio),
      })),
      lastMessage: "已使用新的识别结果。",
    });
  },
  deleteAudioAsset: (audioId) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        audioAssets: (current.audioAssets ?? []).filter((audio) => audio.id !== audioId),
        lines: reorder(
          current.lines.map((line) =>
            line.audioId === audioId ? { ...line, audioId: undefined, duration: undefined, updatedAt: now() } : line,
          ),
        ),
      })),
      lastMessage: "已删除音频素材。",
    });
  },
  generateDialogueFromAudioAssets: () => {
    const project = get().project;
    if (!project) return false;
    if (project.lines.length > 0) {
      set({
        currentIndex: 0,
        errorMessage: "",
        lastMessage: "已按整理后的顺序生成对话界面。",
        project: withProjectUpdate(project, (current) => ({
          ...current,
          lines: reorder(current.lines),
          playback: {
            ...current.playback,
            mode: "audio",
            currentLineId: current.lines[0]?.id,
          },
          originalScript: reorder(current.lines)
            .map((line) => `${current.actors.find((actor) => actor.id === line.speakerId)?.name ?? "Actor"}：${line.text}`)
            .join("\n"),
        })),
      });
      return true;
    }
    const assets = [...(project.audioAssets ?? [])].sort((first, second) => {
      const firstOrder = first.detectedOrder ?? first.uploadOrder ?? 0;
      const secondOrder = second.detectedOrder ?? second.uploadOrder ?? 0;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return (first.uploadOrder ?? 0) - (second.uploadOrder ?? 0);
    });
    if (assets.length === 0) {
      set({ errorMessage: "请先上传音频。" });
      return false;
    }
    const createdLines: ScriptLine[] = assets.map((audio, index) => ({
      id: id("line"),
      speakerId: audio.actorId,
      text: getFinalTranscriptionText(audio),
      type: "dialogue",
      order: index + 1,
      audioId: audio.id,
      duration: audio.duration,
      source: "audio_transcription",
      isEdited: false,
      createdAt: now(),
      updatedAt: now(),
    }));
    set({
      currentIndex: createdLines.length > 0 ? 0 : -1,
      errorMessage: "",
      lastMessage: `已根据 ${createdLines.length} 个音频生成对话排序列表。`,
      project: withProjectUpdate(project, (current) => ({
        ...current,
        lines: reorder(createdLines),
        playback: {
          ...current.playback,
          mode: "audio",
          currentLineId: createdLines[0]?.id,
        },
        originalScript: createdLines
          .map((line) => `${current.actors.find((actor) => actor.id === line.speakerId)?.name ?? "Actor"}：${line.text}`)
          .join("\n"),
      })),
    });
    return true;
  },
  addAudioAssetToDialogue: (audioId) => {
    const project = get().project;
    if (!project) return "";
    const audio = project.audioAssets?.find((item) => item.id === audioId);
    if (!audio) return "";
    const newLine: ScriptLine = {
      id: id("line"),
      speakerId: audio.actorId,
      text: getFinalTranscriptionText(audio),
      type: "dialogue",
      order: project.lines.length + 1,
      audioId: audio.id,
      duration: audio.duration,
      source: "audio_transcription",
      isEdited: false,
      createdAt: now(),
      updatedAt: now(),
    };
    set({
      currentIndex: project.lines.length,
      errorMessage: "",
      lastMessage: "已添加到对话排序列表。",
      project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder([...current.lines, newLine]) })),
    });
    return newLine.id;
  },
  bindLineAudio: (lineId, audioId) => {
    const project = get().project;
    if (!project) return;
    const audio = project.audioAssets?.find((item) => item.id === audioId);
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        lines: current.lines.map((line) =>
          line.id === lineId
            ? {
                ...line,
                speakerId: audio?.actorId ?? line.speakerId,
                audioId,
                duration: audio?.duration,
                updatedAt: now(),
              }
            : line,
        ),
      })),
    });
  },
  moveLine: (lineId, direction) => {
    const project = get().project;
    if (!project) return;
    const lines = [...project.lines];
    const index = lines.findIndex((line) => line.id === lineId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= lines.length) return;
    const [line] = lines.splice(index, 1);
    lines.splice(targetIndex, 0, line);
    set({
      currentIndex: targetIndex,
      project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder(lines) })),
    });
  },
  reorderLineTo: (lineId, targetIndex) => {
    const project = get().project;
    if (!project) return;
    const lines = [...project.lines];
    const index = lines.findIndex((line) => line.id === lineId);
    const boundedTarget = Math.max(0, Math.min(targetIndex, lines.length - 1));
    if (index < 0 || index === boundedTarget) return;
    const [line] = lines.splice(index, 1);
    lines.splice(boundedTarget, 0, line);
    set({
      currentIndex: boundedTarget,
      lastMessage: "对话顺序已调整。",
      project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder(lines) })),
    });
  },
  sortDialogueLines: (mode) => {
    const project = get().project;
    if (!project) return;
    const audioAssets = project.audioAssets ?? [];
    const getAudio = (line: ScriptLine) => audioAssets.find((audio) => audio.id === line.audioId);
    let lines = [...project.lines];
    if (lines.length === 0 && audioAssets.length > 0) {
      lines = audioAssets.map((audio, index) => ({
        id: id("line"),
        speakerId: audio.actorId,
        text: getFinalTranscriptionText(audio),
        type: "dialogue",
        order: index + 1,
        audioId: audio.id,
        duration: audio.duration,
        source: "audio_transcription",
        isEdited: false,
        createdAt: now(),
        updatedAt: now(),
      }));
    }

    if (mode === "alternateActors") {
      const byActor = project.actors.map((actor) =>
        lines
          .filter((line) => line.speakerId === actor.id)
          .sort((first, second) => {
            const firstAudio = getAudio(first);
            const secondAudio = getAudio(second);
            return (firstAudio?.detectedOrder ?? first.order) - (secondAudio?.detectedOrder ?? second.order);
          }),
      );
      const sorted: ScriptLine[] = [];
      const maxLength = Math.max(...byActor.map((items) => items.length), 0);
      for (let index = 0; index < maxLength; index += 1) {
        for (const actorLines of byActor) {
          const line = actorLines[index];
          if (line) sorted.push(line);
        }
      }
      lines = sorted;
    } else if (mode === "fileName") {
      const audioRank = new Map(sortAudioByFileNameNumber(audioAssets).map((audio, index) => [audio.id, index]));
      lines.sort(
        (first, second) =>
          (audioRank.get(first.audioId ?? "") ?? first.order) - (audioRank.get(second.audioId ?? "") ?? second.order),
      );
    } else {
      lines.sort((first, second) => {
        const firstAudio = getAudio(first);
        const secondAudio = getAudio(second);
        if (mode === "uploadTime") {
          return (firstAudio?.uploadOrder ?? first.order) - (secondAudio?.uploadOrder ?? second.order);
        }
        return first.order - second.order;
      });
    }

    set({
      currentIndex: lines.length > 0 ? 0 : -1,
      lastMessage:
        mode === "fileName"
          ? "已按文件名数字排序。"
          : mode === "uploadTime"
            ? "已按上传时间排序。"
            : "已按演员交替排序。",
      project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder(lines) })),
    });
  },
  updateLineText: (lineId, text) => {
    const project = get().project;
    if (!project) return;
    set({
      project: withProjectUpdate(project, (current) => ({
        ...current,
        lines: current.lines.map((line) =>
          line.id === lineId ? { ...line, text, source: "edited", isEdited: true, updatedAt: now() } : line,
        ),
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
      audioId: undefined,
      duration: undefined,
      createdAt: now(),
      updatedAt: now(),
    };
    const nextLines = [...project.lines];
    nextLines.splice(targetIndex + 1, 0, newLine);
    set({ project: withProjectUpdate(project, (current) => ({ ...current, lines: reorder(nextLines) })) });
    return newLine.id;
  },
}));
