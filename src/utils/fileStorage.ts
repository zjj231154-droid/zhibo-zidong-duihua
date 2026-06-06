import type { Project, RecentProject } from "../types/project";

const PROJECTS_KEY = "script-chat-player.projects";
const RECENTS_KEY = "script-chat-player.recents";

function readProjectMap(): Record<string, Project> {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "{}") as Record<string, Project>;
  } catch {
    return {};
  }
}

function writeProjectMap(projects: Record<string, Project>): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function toRecentProject(project: Project): RecentProject {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    actorCount: project.actors.length,
    lineCount: project.lines.length,
  };
}

export async function saveProject(project: Project): Promise<void> {
  try {
    const updatedProject = { ...project, updatedAt: new Date().toISOString() };
    const projects = readProjectMap();
    projects[updatedProject.id] = updatedProject;
    writeProjectMap(projects);

    const recents = getRecentProjects().filter((item) => item.id !== updatedProject.id);
    localStorage.setItem(RECENTS_KEY, JSON.stringify([toRecentProject(updatedProject), ...recents].slice(0, 8)));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "保存失败，请检查本地文件权限。", { cause: error });
  }
}

export async function openProject(projectId?: string): Promise<Project> {
  const projects = readProjectMap();
  if (projectId && projects[projectId]) return projects[projectId];
  throw new Error("项目文件损坏或不存在，无法打开。");
}

export function importProjectFromJson(rawJson: string): Project {
  const project = JSON.parse(rawJson) as Project;
  if (!project.id || !project.name || !Array.isArray(project.actors) || !Array.isArray(project.lines)) {
    throw new Error("项目文件损坏，无法打开。");
  }
  return project;
}

export function getRecentProjects(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]") as RecentProject[];
  } catch {
    return [];
  }
}
