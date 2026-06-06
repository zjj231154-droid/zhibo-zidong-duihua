import { ArrowLeft, ArrowRight, Mic, Upload } from "lucide-react";
import { useRef } from "react";
import { useProjectStore } from "../store/projectStore";

const sampleScript = `主播：大家好，欢迎来到今天的直播间。
助理：今天我们给大家带来了什么产品？
主播：今天给大家介绍一款非常可爱的白色猫咪毛绒玩偶。
助理：它适合多大的小朋友？
主播：适合 3 岁以上儿童，也很适合作为生日礼物。
助理：这个玩偶的手感怎么样？
主播：它是短毛绒材质，摸起来柔软顺滑，抱起来很治愈。
助理：可以放在哪些场景里？
主播：可以放在床头、沙发、书桌旁，也可以作为拍照道具。
助理：听起来真的很适合送人。
主播：是的，它既可爱又实用，非常适合喜欢毛绒玩具的人。`;

export function ImportScriptPage() {
  const textInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const {
    rawScript,
    parseResult,
    errorMessage,
    lastMessage,
    transcriptionStatus,
    setRawScript,
    setView,
    parseCurrentScript,
    transcribeCurrentAudio,
  } = useProjectStore();

  async function handleUpload(file?: File) {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (!ext || !["txt", "md", "json"].includes(ext)) {
      alert("暂不支持该文件格式。");
      return;
    }
    try {
      setRawScript(await file.text());
    } catch {
      alert("文件读取失败，请检查文件格式或重新上传。");
    }
  }

  return (
    <main className="import-screen">
      <section className="import-input">
        <button type="button" className="link-button" onClick={() => setView("new-project")}>
          <ArrowLeft size={17} />
          返回项目设置
        </button>
        <h1>导入剧本</h1>
        <div className="toolbar-row">
          <button type="button" className="ghost-button" onClick={() => textInputRef.current?.click()}>
            <Upload size={18} />
            上传文本
          </button>
          <button type="button" className="ghost-button" onClick={() => audioInputRef.current?.click()}>
            <Mic size={18} />
            上传音频
          </button>
          <button type="button" className="ghost-button" onClick={() => setRawScript(sampleScript)}>
            填入示例
          </button>
          <input
            ref={textInputRef}
            className="hidden-input"
            type="file"
            accept=".txt,.md,.json,text/plain,text/markdown,application/json"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
          />
          <input
            ref={audioInputRef}
            className="hidden-input"
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,.flac,audio/*"
            onChange={(event) => void transcribeCurrentAudio(event.target.files?.[0] as File)}
          />
        </div>
        <textarea
          className="script-textarea"
          value={rawScript}
          placeholder="角色名：台词内容"
          onChange={(event) => setRawScript(event.target.value)}
        />
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <button type="button" className="primary-button" onClick={parseCurrentScript}>
          解析并进入角色设置
          <ArrowRight size={18} />
        </button>
      </section>

      <aside className="parse-panel">
        <div className="section-title">导入结果</div>
        {lastMessage && <div className="success-banner">{lastMessage}</div>}
        <div className="parse-result">
          <p>音频识别状态：{transcriptionStatus}</p>
          {parseResult ? (
            <>
              <p>检测到 {parseResult.actors.length} 个角色</p>
              <ul>
                {parseResult.actors.map((actor) => (
                  <li key={actor}>{actor}</li>
                ))}
              </ul>
              <p>检测到 {parseResult.lines.length} 条台词</p>
              {parseResult.notes.length > 0 && <p>{parseResult.notes.length} 行备注未进入主对话流</p>}
            </>
          ) : (
            <div className="empty-state">上传音频后会进入识别结果确认页；解析后会显示角色和台词数量。</div>
          )}
        </div>
      </aside>
    </main>
  );
}
