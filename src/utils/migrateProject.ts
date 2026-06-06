import type { Actor, BackgroundSettings, BubbleStyle, Project } from "../types/project";

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

  return {
    ...project,
    actors,
    lines: project.lines ?? [],
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
  } as Project;
}
