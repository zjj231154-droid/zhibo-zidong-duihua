import { ArrowLeft, ArrowRight, FileText, Mic } from "lucide-react";
import { useProjectStore } from "../store/projectStore";

export function NewProjectPage() {
  const { projectName, errorMessage, setProjectName, setView, validateAndGoToImport, validateAndGoToAudioTranscription } =
    useProjectStore();

  return (
    <main className="wizard-screen">
      <section className="form-panel">
        <button type="button" className="link-button" onClick={() => setView("home")}>
          <ArrowLeft size={17} />
          返回首页
        </button>
        <h1>新建项目</h1>
        <label className="field">
          项目名称
          <input
            value={projectName}
            maxLength={50}
            placeholder="例如：直播间双人对话"
            onChange={(event) => setProjectName(event.target.value)}
          />
        </label>
        <div className="hint-box">
          系统已为你创建默认演员：
          {"\n"}Walulu
          {"\n"}Fufu福福
        </div>
        <label className="field">
          项目类型
          <input value="双人对话" disabled />
        </label>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <div className="toolbar-row">
          <button type="button" className="primary-button" onClick={validateAndGoToAudioTranscription}>
            <Mic size={18} />
            音频识别整理
            <ArrowRight size={18} />
          </button>
          <button type="button" className="ghost-button" onClick={validateAndGoToImport}>
            <FileText size={18} />
            手动导入剧本
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
