import type { Actor, AudioAsset, BackgroundSettings, BubbleStyle, Project, ScriptLine } from "../types/project";

function defaultBackground(): BackgroundSettings {
  return { fit: "cover", opacity: 100, blur: 0 };
}

function defaultBubbleStyle(actor: Partial<Actor>): BubbleStyle {
  const backgroundColor = actor.bubbleStyle?.backgroundColor ?? actor.bubbleColor ?? (actor.position === "right" ? "#F5F5F5" : "#E8F3FF");
  return {
    backgroundColor,
    textColor: actor.bubbleStyle?.textColor ?? actor.textColor ?? "#111827",
    borderRadius: actor.bubbleStyle?.borderRadius ?? 16,
    paddingX: actor.bubbleStyle?.paddingX ?? 14,
    paddingY: actor.bubbleStyle?.paddingY ?? 10,
    backgroundImagePath: actor.bubbleStyle?.backgroundImagePath,
    backgroundImageMode: actor.bubbleStyle?.backgroundImageMode ?? "cover",
  };
}

function uniqueAudioAssets(assets: AudioAsset[]): AudioAsset[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
}

export function migrateProjectToLatest(project: Partial<Project>): Project {
  const actors = (project.actors ?? []).map((actor) => {
    const bubbleStyle = defaultBubbleStyle(actor);
    return {
      ...actor,
      avatarPath: actor.avatarPath ?? "",
      position: actor.position ?? "left",
      bubbleColor: actor.bubbleColor ?? bubbleStyle.backgroundColor,
      textColor: actor.textColor ?? bubbleStyle.textColor,
      bubbleStyle,
    };
  });

  const migratedAudioAssets = uniqueAudioAssets([
    ...(project.audioAssets ?? []),
    ...(project.audioSources ?? [])
      .filter((audio) => audio.filePath)
      .map((audio) => {
        const segment = audio.subtitles?.[0];
        return {
          id: audio.id,
          actorId: segment?.speakerId ?? actors[0]?.id ?? "unknown",
          fileName: audio.fileName,
          filePath: audio.filePath ?? "",
          duration: audio.duration,
          importedAt: audio.importedAt,
        };
      }),
  ]);

  const lines = (project.lines ?? []).map((line) => {
    const migratedAudio = project.audioSources?.find((audio) => audio.subtitles?.some((segment) => segment.lineId === line.id));
    return {
      ...line,
      audioId: line.audioId ?? migratedAudio?.id,
      duration: line.duration ?? migratedAudio?.duration,
    };
  }) as ScriptLine[];

  return {
    ...project,
    actors,
    lines,
    playback: {
      speed: project.playback?.speed ?? 1,
      currentLineId: project.playback?.currentLineId,
      autoScroll: project.playback?.autoScroll ?? true,
      mode: project.playback?.mode ?? "text",
      currentAudioId: project.playback?.currentAudioId,
    },
    theme: {
      ...(project.theme ?? {}),
      background: {
        ...defaultBackground(),
        ...(project.theme?.background ?? {}),
      },
      fonts: {
        ...(project.theme?.fonts ?? {}),
      },
      canvas: {
        aspectRatio: project.theme?.canvas?.aspectRatio ?? "9:16",
      },
    },
    audioSources: (project.audioSources ?? []).map((audio) => ({
      ...audio,
      transcriptionStatus: audio.transcriptionStatus ?? "pending",
      subtitles: audio.subtitles ?? [],
    })),
    audioAssets: migratedAudioAssets,
  } as Project;
}
