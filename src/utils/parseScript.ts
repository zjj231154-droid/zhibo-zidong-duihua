import type { ParseResult, ParsedLine } from "../types/project";

function findFirstColon(line: string): number {
  const chinese = line.indexOf("：");
  const english = line.indexOf(":");

  if (chinese === -1) return english;
  if (english === -1) return chinese;
  return Math.min(chinese, english);
}

export function parseScript(rawText: string): ParseResult {
  const rows = rawText.split(/\r?\n/);
  const actorsSet = new Set<string>();
  const lines: ParsedLine[] = [];
  const notes: string[] = [];

  rows.forEach((row) => {
    const line = row.trim();
    if (!line) return;

    const colonIndex = findFirstColon(line);
    if (colonIndex === -1) {
      notes.push(line);
      return;
    }

    const speakerName = line.slice(0, colonIndex).trim();
    const text = line.slice(colonIndex + 1).trim();

    if (!speakerName || !text) {
      notes.push(line);
      return;
    }

    actorsSet.add(speakerName);
    lines.push({
      speakerName,
      text,
      order: lines.length + 1,
    });
  });

  const actors = Array.from(actorsSet);
  const errors: string[] = [];

  if (lines.length === 0) {
    errors.push("未检测到有效台词。请使用“角色名：台词内容”的格式。");
  }

  if (actors.length === 0) {
    errors.push("未能识别角色。请使用“角色名：台词内容”的格式。");
  } else if (actors.length === 1) {
    errors.push("当前只检测到 1 个角色。第一版需要双人对话剧本，请检查剧本格式。");
  } else if (actors.length > 2) {
    errors.push("当前检测到多个角色。第一版仅支持两个角色，请删减或合并角色后重试。");
  }

  return {
    success: errors.length === 0 && actors.length === 2,
    actors,
    lines,
    notes,
    errors,
  };
}
