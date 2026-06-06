const maxAudioSize = 100 * 1024 * 1024;

export const supportedAudioExtensions = ["mp3", "wav", "m4a", "webm", "ogg", "flac"];
export const supportedImageExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
export const supportedBubbleExtensions = ["png", "svg", "webp"];
export const supportedFontExtensions = ["ttf", "otf", "woff", "woff2"];

export function getFileExtension(file: File): string {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

export function validateAudioFile(file?: File): string[] {
  const errors: string[] = [];
  if (!file || file.size === 0) errors.push("音频文件为空。");
  if (!file) return errors;
  if (!supportedAudioExtensions.includes(getFileExtension(file))) {
    errors.push("暂不支持该音频格式，请上传 mp3、wav、m4a、webm、ogg 或 flac 文件。");
  }
  if (file.size > maxAudioSize) {
    errors.push("音频文件过大，请上传 100MB 以内的音频文件。");
  }
  return errors;
}

export function validateImageFile(file: File): string[] {
  return supportedImageExtensions.includes(getFileExtension(file)) ? [] : ["背景图片格式不支持。"];
}

export function validateBubbleFile(file: File): string[] {
  return supportedBubbleExtensions.includes(getFileExtension(file)) ? [] : ["气泡图片格式不支持。"];
}

export function validateFontFile(file: File): string[] {
  return supportedFontExtensions.includes(getFileExtension(file)) ? [] : ["字体格式不支持。"];
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function createAssetPath(kind: string, file: File): string {
  return `assets/${kind}/${Date.now()}_${file.name}`;
}
