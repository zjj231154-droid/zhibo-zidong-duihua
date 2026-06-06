import type { Actor, Project } from "../types/project";

function actorForLine(project: Project, speakerId: string): Actor {
  return project.actors.find((actor) => actor.id === speakerId) ?? project.actors[0];
}

export function exportProjectAsTxt(project: Project): string {
  return project.lines
    .filter((line) => line.type === "dialogue" && line.text.trim())
    .sort((a, b) => a.order - b.order)
    .map((line) => `${actorForLine(project, line.speakerId).name}：${line.text}`)
    .join("\n");
}

export function exportProjectAsMarkdown(project: Project): string {
  const actors = project.actors.map((actor) => `- ${actor.name}`).join("\n");
  const script = project.lines
    .filter((line) => line.type === "dialogue" && line.text.trim())
    .sort((a, b) => a.order - b.order)
    .map((line) => `**${actorForLine(project, line.speakerId).name}：** ${line.text}`)
    .join("\n\n");

  return `# ${project.name}\n\n## 角色\n\n${actors}\n\n## 剧本\n\n${script}\n`;
}

export function exportProjectAsJson(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
