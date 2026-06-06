import type { FontSettings } from "../types/project";

const fontStyleId = "script-chat-player-custom-fonts";

function fontFace(name: string | undefined, path: string | undefined): string {
  if (!name || !path) return "";
  return `@font-face{font-family:"${name}";src:url("${path}");font-display:swap;}`;
}

export function applyFontSettings(fonts?: FontSettings): void {
  const existing = document.getElementById(fontStyleId);
  existing?.remove();

  if (!fonts) return;
  const css = [
    fontFace(fonts.chatFontFamily, fonts.chatFontPath),
    fontFace(fonts.actorNameFontFamily, fonts.actorNameFontPath),
    fontFace(fonts.uiFontFamily, fonts.uiFontPath),
  ]
    .filter(Boolean)
    .join("\n");

  if (!css) return;
  const style = document.createElement("style");
  style.id = fontStyleId;
  style.textContent = css;
  document.head.appendChild(style);
}
