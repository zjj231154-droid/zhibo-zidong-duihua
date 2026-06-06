import { Download, Home, Palette, Save, Settings } from "lucide-react";

interface ProjectHeaderProps {
  projectName: string;
  onSave: () => void;
  onExport: () => void;
  onHome: () => void;
  onSettings: () => void;
  onTheme: () => void;
}

export function ProjectHeader({ projectName, onSave, onExport, onHome, onSettings, onTheme }: ProjectHeaderProps) {
  return (
    <header className="project-header">
      <button type="button" className="icon-button" title="返回首页" onClick={onHome}>
        <Home size={18} />
      </button>
      <h1>{projectName}</h1>
      <div className="header-actions">
        <button type="button" className="icon-button" title="角色设置" onClick={onSettings}>
          <Settings size={18} />
        </button>
        <button type="button" className="icon-button" title="主题设置" onClick={onTheme}>
          <Palette size={18} />
        </button>
        <button type="button" className="ghost-button" onClick={onExport}>
          <Download size={18} />
          导出
        </button>
        <button type="button" className="primary-button" onClick={onSave}>
          <Save size={18} />
          保存
        </button>
      </div>
    </header>
  );
}
