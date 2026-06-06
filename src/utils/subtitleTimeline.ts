import type { Actor, ScriptLine, SubtitleSegment } from "../types/project";

function weightForLine(text: string): number {
  return Math.max(text.trim().length, 4);
}

export function generateEstimatedSubtitleTimeline(
  lines: ScriptLine[],
  _actors: Actor[],
  audioDuration: number,
): SubtitleSegment[] {
  const dialogueLines = lines.filter((line) => line.type === "dialogue" && line.text.trim());
  if (!Number.isFinite(audioDuration) || audioDuration <= 0 || dialogueLines.length === 0) return [];

  const totalWeight = dialogueLines.reduce((sum, line) => sum + weightForLine(line.text), 0);
  const minDuration = Math.min(1, audioDuration / dialogueLines.length);
  let cursor = 0;

  return dialogueLines.map((line, index) => {
    const remainingLines = dialogueLines.length - index;
    const remainingDuration = Math.max(audioDuration - cursor, 0);
    const isLast = index === dialogueLines.length - 1;
    const proportional = (weightForLine(line.text) / totalWeight) * audioDuration;
    const maxForThis = Math.max(remainingDuration - Math.max(remainingLines - 1, 0) * minDuration, 0);
    const duration = isLast ? remainingDuration : Math.min(Math.max(proportional, minDuration), maxForThis);
    const startTime = cursor;
    const endTime = isLast ? audioDuration : Math.min(audioDuration, startTime + duration);
    cursor = endTime;

    return {
      id: `subtitle_${crypto.randomUUID()}`,
      lineId: line.id,
      speakerId: line.speakerId,
      text: line.text,
      startTime: Number(startTime.toFixed(3)),
      endTime: Number(endTime.toFixed(3)),
    };
  });
}

export function findSubtitleAtTime(segments: SubtitleSegment[], currentTime: number): SubtitleSegment | undefined {
  return segments.find((segment) => currentTime >= segment.startTime && currentTime < segment.endTime);
}

export function validateSubtitleTimeline(segments: SubtitleSegment[], audioDuration?: number): string[] {
  const errors: string[] = [];
  segments.forEach((segment, index) => {
    if (segment.startTime < 0 || segment.endTime <= segment.startTime) {
      errors.push("字幕时间设置不正确，请检查开始时间和结束时间。");
    }
    const previous = segments[index - 1];
    if (previous && segment.startTime < previous.endTime) {
      errors.push("字幕时间设置不正确，当前段开始时间不能小于上一段结束时间。");
    }
    if (audioDuration && segment.endTime > audioDuration + 0.01) {
      errors.push("字幕时间设置不正确，结束时间不能超过音频总时长。");
    }
  });
  return Array.from(new Set(errors));
}
