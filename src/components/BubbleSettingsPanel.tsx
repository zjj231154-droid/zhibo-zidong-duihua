import type { Actor, BubbleImageMode } from "../types/project";
import { readFileAsDataUrl, validateBubbleFile } from "../utils/assetStorage";
import { AssetUploader } from "./AssetUploader";

interface BubbleSettingsPanelProps {
  actor: Actor;
  onChange: (changes: Partial<Actor["bubbleStyle"]>) => void;
}

export function BubbleSettingsPanel({ actor, onChange }: BubbleSettingsPanelProps) {
  const style = actor.bubbleStyle;

  async function handleUpload(file: File) {
    const errors = validateBubbleFile(file);
    if (errors.length) {
      alert(errors.join(" "));
      return;
    }
    onChange({ backgroundImagePath: await readFileAsDataUrl(file) });
  }

  return (
    <section className="settings-panel">
      <h2>{actor.name} 气泡</h2>
      <label className="field inline-field">
        气泡颜色
        <input type="color" value={style.backgroundColor} onChange={(event) => onChange({ backgroundColor: event.target.value })} />
      </label>
      <label className="field inline-field">
        文字颜色
        <input type="color" value={style.textColor} onChange={(event) => onChange({ textColor: event.target.value })} />
      </label>
      <label className="field">
        圆角：{style.borderRadius}px
        <input
          type="range"
          min={0}
          max={28}
          value={style.borderRadius}
          onChange={(event) => onChange({ borderRadius: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        横向内边距：{style.paddingX}px
        <input
          type="range"
          min={8}
          max={34}
          value={style.paddingX}
          onChange={(event) => onChange({ paddingX: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        纵向内边距：{style.paddingY}px
        <input
          type="range"
          min={6}
          max={28}
          value={style.paddingY}
          onChange={(event) => onChange({ paddingY: Number(event.target.value) })}
        />
      </label>
      <AssetUploader
        label="气泡背景图"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/svg+xml,image/webp"
        value={style.backgroundImagePath}
        onUpload={(file) => void handleUpload(file)}
        onClear={() => onChange({ backgroundImagePath: undefined })}
      />
      <label className="field">
        图片方式
        <select
          value={style.backgroundImageMode ?? "cover"}
          onChange={(event) => onChange({ backgroundImageMode: event.target.value as BubbleImageMode })}
        >
          <option value="stretch">拉伸</option>
          <option value="repeat">平铺</option>
          <option value="cover">铺满</option>
        </select>
      </label>
    </section>
  );
}
