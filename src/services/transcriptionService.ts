export type TranscriptionMode = "mock" | "cloud" | "local";

export interface TranscriptionOptions {
  mode: TranscriptionMode;
  language?: "zh" | "en" | "auto";
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
}

const mockText = `主播：大家好，欢迎来到今天的直播间。
助理：今天我们给大家带来了什么产品？
主播：今天给大家介绍一款非常可爱的白色猫咪毛绒玩偶。
助理：它适合多大的小朋友？`;

export async function transcribeAudio(
  file: File,
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  if (!file || file.size === 0) {
    return { success: false, fullText: "", segments: [], errors: ["音频文件为空。"] };
  }

  if (options.mode !== "mock") {
    return {
      success: false,
      fullText: "",
      segments: [],
      errors: ["当前未配置真实语音识别服务，请先使用 mock 模式。"],
    };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 600));

  return {
    success: true,
    fullText: mockText,
    segments: mockText.split("\n").map((text, index) => {
      const [speakerName] = text.split(/[：:]/);
      return {
        id: crypto.randomUUID(),
        start: index * 3,
        end: index * 3 + 2.8,
        text,
        speakerName,
      };
    }),
    errors: [],
  };
}
