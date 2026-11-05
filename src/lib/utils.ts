import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the custom theme scales from globals.css; otherwise
 * `text-subhead` is read as a text colour and silently drops e.g. `text-on-accent`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["footnote", "subhead", "headline"],
      shadow: ["card", "raised"],
      radius: ["card"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
