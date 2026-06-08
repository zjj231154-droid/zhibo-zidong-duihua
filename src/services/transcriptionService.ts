export type TranscriptionMode = "mock" | "cloud" | "local";
export type TranscriptionLanguage = "zh-CN";

export const TRANSCRIPTION_PROMPT = [
  "这是一段中文双主播对话音频。",
  "请逐字转写音频内容，不要总结，不要润色，不要改写。",
  "请保留口语表达、重复词和停顿词。",
  "专有名词包括：Walulu、Fufu福福、福福、瓦鲁鲁、加菲猫、AI陪伴、智能互动玩具、直播间、主播、助播、ChatGPT、通义千问、EN-71、RoHS、FCC。",
].join("");

export interface TranscriptionOptions {
  mode: TranscriptionMode;
  language?: TranscriptionLanguage;
  prompt?: string;
}

export interface TranscriptionSegment {
  id: string;
  start?: number;
  end?: number;
  text: string;
  speakerName?: string;
}

export interface TranscriptionResult {
  success: boolean;
  fullText: string;
  segments: TranscriptionSegment[];
  errors: string[];
  provider: string;
  language: TranscriptionLanguage;
  prompt: string;
}

export async function transcribeAudio(file: File, options: TranscriptionOptions): Promise<TranscriptionResult> {
  const language = options.language ?? "zh-CN";
  const prompt = options.prompt ?? TRANSCRIPTION_PROMPT;

  if (!file || file.size === 0) {
    return {
      success: false,
      fullText: "",
      segments: [],
      errors: ["音频文件为空。"],
      provider: options.mode,
      language,
      prompt,
    };
  }

  if (options.mode !== "mock") {
    return {
      success: false,
      fullText: "",
      segments: [],
      errors: ["当前未配置真实 ASR 服务，请接入后端 ASR 后再进行真实识别。"],
      provider: options.mode,
      language,
      prompt,
    };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 300));

  return {
    success: false,
    fullText: "",
    segments: [],
    errors: ["当前版本未接入真实 ASR，不能把模拟文本当作原始识别结果。请手动输入文字，或接入后端 ASR。"],
    provider: "mock",
    language,
    prompt,
  };
}
