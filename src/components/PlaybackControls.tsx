import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import type { PlaybackSpeed, PlaybackStatus } from "../types/project";

interface PlaybackControlsProps {
  status: PlaybackStatus;
  speed: PlaybackSpeed;
  autoScroll: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onAutoScrollChange: (enabled: boolean) => void;
}

const speeds: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

export function PlaybackControls({
  status,
  speed,
  autoScroll,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onRestart,
  onSpeedChange,
  onAutoScrollChange,
}: PlaybackControlsProps) {
  return (
    <footer className="playback-controls">
      <button type="button" className="icon-button" title="上一句" onClick={onPrev}>
        <SkipBack size={18} />
      </button>
      {status === "playing" ? (
        <button type="button" className="primary-button" onClick={onPause}>
          <Pause size={18} />
          暂停
        </button>
      ) : (
        <button type="button" className="primary-button" onClick={onPlay}>
          <Play size={18} />
          播放
        </button>
      )}
      <button type="button" className="icon-button" title="下一句" onClick={onNext}>
        <SkipForward size={18} />
      </button>
      <button type="button" className="icon-button" title="重新开始" onClick={onRestart}>
        <RotateCcw size={18} />
      </button>
      <div className="segmented" aria-label="播放速度">
        {speeds.map((item) => (
          <button
            type="button"
            key={item}
            className={speed === item ? "selected" : ""}
            onClick={() => onSpeedChange(item)}
          >
            {item}x
          </button>
        ))}
      </div>
      <label className="switch-label">
        <input
          type="checkbox"
          checked={autoScroll}
          onChange={(event) => onAutoScrollChange(event.target.checked)}
        />
        自动滚动
      </label>
    </footer>
  );
}
