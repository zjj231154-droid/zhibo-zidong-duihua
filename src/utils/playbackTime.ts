import type { PlaybackSpeed } from "../types/project";

export function getLineDuration(text: string, speed: PlaybackSpeed): number {
  const base = 1000;
  const perChar = 80;
  const min = 1000;
  const max = 5000;
  const duration = Math.min(Math.max(base + text.length * perChar, min), max);
  return duration / speed;
}
