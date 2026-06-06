import { FileJson, FolderOpen, Plus } from "lucide-react";
import { useRef } from "react";
import { importProjectFromJson, openProject } from "../utils/fileStorage";
import { useProjectStore } from "../store/projectStore";

export function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { recents, startNewProject, setProject, refreshRecents, errorMessage } = useProjectStore();

  async function openRecent(projectId: string) {
    try {
      setProject(await openProject(projectId));
    } catch (error) {
      alert(error instanceof Error ? error.message : "打开项目失败。");
      refreshRecents();
    }
  }

  async function handleFile(file?: File) {
    if (!file) return;
    try {
      const project = importProjectFromJson(await file.text());
      setProject(project);
    } catch (error) {
      alert(error instanceof Error ? error.message : "打开项目失败。");
    }
  }

  return (
    <main className="home-screen">
      <section className="home-panel">
        <div className="home-copy">
          <p className="eyebrow">Script Chat Player</p>
          <h1>双演员剧本对话播放器</h1>
          <p>粘贴双人剧本，识别角色，生成左右聊天气泡，并按顺序播放、编辑、保存和导出。</p>
        </div>
        <div className="home-actions">
          <button type="button" className="primary-button large" onClick={startNewProject}>
            <Plus size={20} />
            新建项目
          </button>
          <button type="button" className="ghost-button large" onClick={() => inputRef.current?.click()}>
            <FolderOpen size={20} />
            打开本地项目
          </button>
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
      </section>

      <section className="recents-panel">
        <div className="section-title">最近项目</div>
        {recents.length === 0 ? (
          <div className="empty-state">
            <FileJson size={28} />
            暂无最近项目
          </div>
        ) : (
          <div className="recent-list">
            {recents.map((item) => (
              <button type="button" key={item.id} className="recent-item" onClick={() => void openRecent(item.id)}>
                <strong>{item.name}</strong>
                <span>{new Date(item.updatedAt).toLocaleString()}</span>
                <em>
                  {item.actorCount} 个角色 / {item.lineCount} 条台词
                </em>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
