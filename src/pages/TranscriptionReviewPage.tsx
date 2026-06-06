import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "../store/projectStore";

export function TranscriptionReviewPage() {
  const {
    rawScript,
    transcriptionFileName,
    transcriptionStatus,
    errorMessage,
    setRawScript,
    setView,
    confirmTranscriptionText,
  } = useProjectStore();
  const [draft, setDraft] = useState(rawScript);

  return (
    <main className="import-screen">
      <section className="import-input">
        <button type="button" className="link-button" onClick={() => setView("import-script")}>
          <ArrowLeft size={17} />
          返回导入页
        </button>
        <h1>识别结果确认</h1>
        <div className="status-strip inline-status">
          <span>音频：{transcriptionFileName || "未命名音频"}</span>
          <span>状态：{transcriptionStatus}</span>
        </div>
        <textarea
          className="script-textarea"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setRawScript(event.target.value);
          }}
        />
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <div className="toolbar-row">
          <button type="button" className="ghost-button" onClick={() => setDraft(rawScript)}>
            <RefreshCw size={18} />
            重新载入结果
          </button>
          <button type="button" className="primary-button" onClick={() => confirmTranscriptionText(draft)}>
            <Check size={18} />
            确认并解析
          </button>
        </div>
      </section>

      <aside className="parse-panel">
        <div className="section-title">格式提示</div>
        <div className="parse-result">
          <p>请将识别结果整理为以下格式：</p>
          <pre className="hint-box">{`角色名：台词内容
角色名：台词内容`}</pre>
          <p>当前 1.1 版本使用 mock 转写结果，真实 API 可接入 `src/services/transcriptionService.ts`。</p>
        </div>
      </aside>
    </main>
  );
}
