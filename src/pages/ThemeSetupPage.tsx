import { ArrowLeft, Check } from "lucide-react";
import { BackgroundSettingsPanel } from "../components/BackgroundSettingsPanel";
import { BubbleSettingsPanel } from "../components/BubbleSettingsPanel";
import { FontUploader } from "../components/FontUploader";
import { ThemePreview } from "../components/ThemePreview";
import { useProjectStore } from "../store/projectStore";

export function ThemeSetupPage() {
  const { project, updateBackground, updateActorBubbleStyle, updateFonts, updateCanvasAspectRatio, saveCurrentProject, setView } =
    useProjectStore();

  if (!project) return null;

  return (
    <main className="theme-screen">
      <section className="theme-toolbar">
        <button type="button" className="link-button" onClick={() => setView("player")}>
          <ArrowLeft size={17} />
          返回播放页
        </button>
        <h1>界面与素材设置</h1>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            void saveCurrentProject();
            setView("player");
          }}
        >
          <Check size={18} />
          保存并返回
        </button>
      </section>

      <section className="theme-layout">
        <div className="theme-settings">
          <section className="settings-panel">
            <h2>画布比例</h2>
            <div className="segmented full" aria-label="聊天画布比例">
              {(["9:16", "3:2", "1:1"] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={(project.theme.canvas?.aspectRatio ?? "9:16") === ratio ? "selected" : ""}
                  onClick={() => updateCanvasAspectRatio(ratio)}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </section>
          <BackgroundSettingsPanel settings={project.theme.background!} onChange={updateBackground} />
          {project.actors.map((actor) => (
            <BubbleSettingsPanel
              key={actor.id}
              actor={actor}
              onChange={(changes) => updateActorBubbleStyle(actor.id, changes)}
            />
          ))}
          <FontUploader fonts={project.theme.fonts} onChange={updateFonts} />
        </div>
        <aside className="theme-preview-sticky">
          <div className="section-title">实时预览</div>
          <ThemePreview actors={project.actors} theme={project.theme} />
        </aside>
      </section>
    </main>
  );
}
