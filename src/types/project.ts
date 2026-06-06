export type ActorPosition = "left" | "right";
export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2;
export type PlaybackStatus = "idle" | "playing" | "paused" | "ended";
export type PlaybackMode = "text" | "audio";
export type CanvasAspectRatio = "9:16" | "3:2" | "1:1";
export type AppView =
  | "home"
  | "new-project"
  | "import-script"
  | "transcription-review"
  | "actor-setup"
  | "theme-setup"
  | "player";
export type BackgroundFit = "cover" | "contain" | "repeat" | "center";
export type BubbleImageMode = "stretch" | "repeat" | "cover";
export type TranscriptionStatus = "idle" | "uploading" | "transcribing" | "success" | "failed";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  originalScript: string;
  actors: Actor[];
  lines: ScriptLine[];
  playback: PlaybackSettings;
  theme: ProjectTheme;
  audioSources?: AudioSource[];
}

export interface Actor {
  id: string;
  name: string;
  avatarPath: string;
  position: ActorPosition;
  bubbleStyle: BubbleStyle;
  /** @deprecated kept to migrate 1.0 projects */
  bubbleColor: string;
  /** @deprecated kept to migrate 1.0 projects */
  textColor: string;
}

export interface ScriptLine {
  id: string;
  speakerId: string;
  text: string;
  type: "dialogue" | "note";
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybackSettings {
  speed: PlaybackSpeed;
  currentLineId?: string;
  autoScroll: boolean;
  mode: PlaybackMode;
  currentAudioId?: string;
}

export interface ProjectTheme {
  background?: BackgroundSettings;
  fonts?: FontSettings;
  canvas?: CanvasSettings;
}

export interface CanvasSettings {
  aspectRatio: CanvasAspectRatio;
}

export interface BackgroundSettings {
  imagePath?: string;
  fit: BackgroundFit;
  opacity: number;
  blur: number;
}

export interface BubbleStyle {
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  backgroundImagePath?: string;
  backgroundImageMode?: BubbleImageMode;
}

export interface FontSettings {
  chatFontFamily?: string;
  chatFontPath?: string;
  actorNameFontFamily?: string;
  actorNameFontPath?: string;
  uiFontFamily?: string;
  uiFontPath?: string;
}

export interface AudioSource {
  id: string;
  fileName: string;
  filePath?: string;
  duration?: number;
  importedAt: string;
  transcriptionText?: string;
  transcriptionStatus: "pending" | "success" | "failed";
  subtitles?: SubtitleSegment[];
}

export interface SubtitleSegment {
  id: string;
  lineId: string;
  speakerId: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface ParsedLine {
  speakerName: string;
  text: string;
  order: number;
}

export interface ParseResult {
  success: boolean;
  actors: string[];
  lines: ParsedLine[];
  notes: string[];
  errors: string[];
}

export interface RecentProject {
  id: string;
  name: string;
  updatedAt: string;
  actorCount: number;
  lineCount: number;
}
