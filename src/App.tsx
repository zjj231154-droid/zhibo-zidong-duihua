import { ActorSetupPage } from "./pages/ActorSetupPage";
import { AudioTranscriptionPage } from "./pages/AudioTranscriptionPage";
import { HomePage } from "./pages/HomePage";
import { ImportScriptPage } from "./pages/ImportScriptPage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { PlayerPage } from "./pages/PlayerPage";
import { ThemeSetupPage } from "./pages/ThemeSetupPage";
import { TranscriptionReviewPage } from "./pages/TranscriptionReviewPage";
import { useProjectStore } from "./store/projectStore";
import "./index.css";

export default function App() {
  const view = useProjectStore((state) => state.view);

  if (view === "new-project") return <NewProjectPage />;
  if (view === "import-script") return <ImportScriptPage />;
  if (view === "audio-transcription") return <AudioTranscriptionPage />;
  if (view === "transcription-review") return <TranscriptionReviewPage />;
  if (view === "actor-setup") return <ActorSetupPage />;
  if (view === "theme-setup") return <ThemeSetupPage />;
  if (view === "player") return <PlayerPage />;
  return <HomePage />;
}
