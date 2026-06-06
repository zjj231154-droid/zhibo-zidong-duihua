import { Trash2, Upload } from "lucide-react";

interface AssetUploaderProps {
  label: string;
  accept: string;
  value?: string;
  onUpload: (file: File) => void;
  onClear?: () => void;
}

export function AssetUploader({ label, accept, value, onUpload, onClear }: AssetUploaderProps) {
  return (
    <label className="asset-uploader">
      <span>{label}</span>
      {value && <img src={value} alt={`${label} 预览`} />}
      <span className="file-button">
        <Upload size={17} />
        上传
        <input type="file" accept={accept} onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} />
      </span>
      {value && onClear && (
        <button type="button" className="ghost-button" onClick={onClear}>
          <Trash2 size={16} />
          删除
        </button>
      )}
    </label>
  );
}
