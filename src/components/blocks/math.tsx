"use client";
import katex from "katex";
import { useMemo } from "react";

/** KaTeX with trust disabled: \href, \url and HTML extensions are rejected. */
export function Math({ latex, display = false }: { latex: string; display?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        trust: false,
        strict: "ignore",
        output: "htmlAndMathml",
      }),
    [latex, display],
  );
  return (
    <span
      className={display ? "block overflow-x-auto py-2 text-center" : undefined}
      // KaTeX-generated markup from LaTeX (trust: false), not model-authored HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
