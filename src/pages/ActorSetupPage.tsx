import { ArrowLeft, ArrowRight, Palette, Trash2, Upload } from "lucide-react";
import { ActorAvatar } from "../components/ActorAvatar";
import { useProjectStore } from "../store/projectStore";
import type { Actor, ActorPosition } from "../types/project";
import { readFileAsDataUrl, validateImageFile } from "../utils/assetStorage";

export function ActorSetupPage() {
  const { project, errorMessage, updateActor, setActorPosition, updateActorBubbleStyle, finishActorSetup, setView } =
    useProjectStore();

  if (!project) return null;

  async function handleAvatar(actor: Actor, file?: File) {
    if (!file) return;
    const errors = validateImageFile(file);
    if (errors.length) {
      alert("该图片格式暂不支持。");
      return;
    }
    try {
      updateActor(actor.id, { avatarPath: await readFileAsDataUrl(file) });
    } catch {
      alert("头像上传失败，请重新选择图片。");
    }
  }

  return (
    <main className="wizard-screen wide">
      <section className="form-panel wide-panel">
        <button type="button" className="link-button" onClick={() => setView("import-script")}>
          <ArrowLeft size={17} />
          返回导入
        </button>
        <h1>角色设置</h1>
        <div className="actor-grid">
          {project.actors.map((actor) => (
            <section className="actor-card" key={actor.id}>
              <ActorAvatar actor={actor} />
              <label className="field">
                角色名称
                <input
                  value={actor.name}
                  maxLength={30}
                  onChange={(event) => updateActor(actor.id, { name: event.target.value })}
                />
              </label>
              <label className="field">
                头像
                <span className="file-button">
                  <Upload size={17} />
                  上传头像
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.gif,image/*"
                    onChange={(event) => void handleAvatar(actor, event.target.files?.[0])}
                  />
                </span>
              </label>
              {actor.avatarPath && (
                <button type="button" className="ghost-button" onClick={() => updateActor(actor.id, { avatarPath: "" })}>
                  <Trash2 size={16} />
                  删除头像
                </button>
              )}
              <div className="segmented full">
                {(["left", "right"] as ActorPosition[]).map((position) => (
                  <button
                    type="button"
                    key={position}
                    className={actor.position === position ? "selected" : ""}
                    onClick={() => setActorPosition(actor.id, position)}
                  >
                    {position === "left" ? "左侧" : "右侧"}
                  </button>
                ))}
              </div>
              <label className="field inline-field">
                气泡颜色
                <input
                  type="color"
                  value={actor.bubbleStyle.backgroundColor}
                  onChange={(event) => updateActorBubbleStyle(actor.id, { backgroundColor: event.target.value })}
                />
              </label>
              <label className="field inline-field">
                文字颜色
                <input
                  type="color"
                  value={actor.bubbleStyle.textColor}
                  onChange={(event) => updateActorBubbleStyle(actor.id, { textColor: event.target.value })}
                />
              </label>
            </section>
          ))}
        </div>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <div className="toolbar-row">
          <button type="button" className="ghost-button" onClick={() => setView("theme-setup")}>
            <Palette size={18} />
            继续设置主题
          </button>
          <button type="button" className="primary-button" onClick={finishActorSetup}>
            生成对话界面
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
