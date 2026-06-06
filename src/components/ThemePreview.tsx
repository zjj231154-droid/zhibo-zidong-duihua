import type { Actor, ProjectTheme } from "../types/project";

interface ThemePreviewProps {
  actors: Actor[];
  theme: ProjectTheme;
}

export function ThemePreview({ actors, theme }: ThemePreviewProps) {
  const background = theme.background;
  const backgroundSize = background?.fit === "contain" ? "contain" : background?.fit === "center" ? "auto" : "cover";
  const backgroundRepeat = background?.fit === "repeat" ? "repeat" : "no-repeat";

  return (
    <section className="theme-preview">
      <div
        className="theme-preview-bg"
        style={{
          backgroundImage: background?.imagePath ? `url(${background.imagePath})` : undefined,
          backgroundSize,
          backgroundRepeat,
          backgroundPosition: "center",
          opacity: (background?.opacity ?? 100) / 100,
          filter: `blur(${background?.blur ?? 0}px)`,
        }}
      />
      <div className="theme-preview-content">
        {actors.slice(0, 2).map((actor, index) => (
          <div key={actor.id} className={`preview-bubble ${actor.position}`}>
            <strong style={{ fontFamily: theme.fonts?.actorNameFontFamily }}>{actor.name}</strong>
            <p
              style={{
                fontFamily: theme.fonts?.chatFontFamily,
                color: actor.bubbleStyle.textColor,
                backgroundColor: actor.bubbleStyle.backgroundColor,
                borderRadius: actor.bubbleStyle.borderRadius,
                padding: `${actor.bubbleStyle.paddingY}px ${actor.bubbleStyle.paddingX}px`,
                backgroundImage: actor.bubbleStyle.backgroundImagePath
                  ? `url(${actor.bubbleStyle.backgroundImagePath})`
                  : undefined,
                backgroundSize: actor.bubbleStyle.backgroundImageMode === "stretch" ? "100% 100%" : "cover",
                backgroundRepeat: actor.bubbleStyle.backgroundImageMode === "repeat" ? "repeat" : "no-repeat",
              }}
            >
              {index === 0 ? "这是左侧角色的预览台词。" : "这是右侧角色的预览台词。"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
