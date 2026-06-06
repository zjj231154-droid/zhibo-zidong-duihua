import type { BackgroundFit, BackgroundSettings } from "../types/project";
import { readFileAsDataUrl, validateImageFile } from "../utils/assetStorage";
import { AssetUploader } from "./AssetUploader";

interface BackgroundSettingsPanelProps {
  settings: BackgroundSettings;
  onChange: (changes: Partial<BackgroundSettings>) => void;
}

const fitOptions: Array<{ value: BackgroundFit; label: string }> = [
  { value: "cover", label: "铺满" },
  { value: "contain", label: "完整显示" },
  { value: "repeat", label: "平铺" },
  { value: "center", label: "居中" },
];

export function BackgroundSettingsPanel({ settings, onChange }: BackgroundSettingsPanelProps) {
  async function handleUpload(file: File) {
    const errors = validateImageFile(file);
    if (errors.length) {
      alert(errors.join(" "));
      return;
    }
    onChange({ imagePath: await readFileAsDataUrl(file) });
  }

  return (
    <section className="settings-panel">
      <h2>聊天背景</h2>
      <AssetUploader
        label="背景图片"
        accept=".png,.jpg,.jpeg,.webp,.gif,image/*"
        value={settings.imagePath}
        onUpload={(file) => void handleUpload(file)}
        onClear={() => onChange({ imagePath: undefined })}
      />
      <label className="field">
        显示方式
        <select value={settings.fit} onChange={(event) => onChange({ fit: event.target.value as BackgroundFit })}>
          {fitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        透明度：{settings.opacity}%
        <input
          type="range"
          min={0}
          max={100}
          value={settings.opacity}
          onChange={(event) => onChange({ opacity: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        模糊：{settings.blur}px
        <input
          type="range"
          min={0}
          max={20}
          value={settings.blur}
          onChange={(event) => onChange({ blur: Number(event.target.value) })}
        />
      </label>
    </section>
  );
}
