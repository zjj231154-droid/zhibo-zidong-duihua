import type { FontSettings } from "../types/project";
import { readFileAsDataUrl, validateFontFile } from "../utils/assetStorage";

interface FontUploaderProps {
  fonts?: FontSettings;
  onChange: (changes: Partial<FontSettings>) => void;
}

function fontName(file: File, scope: string): string {
  return `SCP_${scope}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export function FontUploader({ fonts, onChange }: FontUploaderProps) {
  async function upload(file: File, scope: "chat" | "actor") {
    const errors = validateFontFile(file);
    if (errors.length) {
      alert(errors.join(" "));
      return;
    }
    const path = await readFileAsDataUrl(file);
    const family = fontName(file, scope);
    if (scope === "chat") onChange({ chatFontFamily: family, chatFontPath: path });
    if (scope === "actor") onChange({ actorNameFontFamily: family, actorNameFontPath: path });
  }

  return (
    <section className="settings-panel">
      <h2>字体设置</h2>
      <label className="field">
        聊天文字字体
        <span className="file-button">
          上传字体
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0], "chat")} />
        </span>
        <small>{fonts?.chatFontFamily ?? "系统默认字体"}</small>
      </label>
      <label className="field">
        角色名称字体
        <span className="file-button">
          上传字体
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0], "actor")} />
        </span>
        <small>{fonts?.actorNameFontFamily ?? "系统默认字体"}</small>
      </label>
      <button type="button" className="ghost-button" onClick={() => onChange({ chatFontFamily: undefined, chatFontPath: undefined, actorNameFontFamily: undefined, actorNameFontPath: undefined })}>
        恢复默认字体
      </button>
    </section>
  );
}
