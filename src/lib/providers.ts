import type { Category } from "../types";

export const providerVisuals: Record<
  Category,
  { label: string; image: string; accent: string; surface: string }
> = {
  grok: {
    label: "Grok",
    image: "https://www.google.com/s2/favicons?domain=grok.com&sz=128",
    accent: "#0fb9b1",
    surface: "#0d2a2e",
  },
  flow: {
    label: "Flow",
    image: "https://www.google.com/s2/favicons?domain=labs.google&sz=128",
    accent: "#ffb020",
    surface: "#35260b",
  },
  dreamina: {
    label: "Dreamina",
    image: "https://www.google.com/s2/favicons?domain=dreamina.capcut.com&sz=128",
    accent: "#ff6b6b",
    surface: "#351718",
  },
};
