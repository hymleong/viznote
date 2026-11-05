"use client";
import { useEffect, useId, useState } from "react";
import DOMPurify from "dompurify";

/**
 * Renders generated Mermaid source. Mermaid runs with securityLevel "strict"
 * and htmlLabels off, and the SVG it produces is sanitised again with DOMPurify
 * (SVG profile) before insertion.
 */
export function MermaidDiagram({ source, caption }: { source: string; caption: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "neutral",
          htmlLabels: false,
          flowchart: { htmlLabels: false },
        });
        await mermaid.parse(source);
        const { svg: out } = await mermaid.render(`m${id}`, source);
        const clean = DOMPurify.sanitize(out, { USE_PROFILES: { svg: true, svgFilters: true } });
        if (!cancelled) setSvg(clean);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  if (failed)
    return (
      <pre className="scroll-thin overflow-x-auto rounded-2xl bg-surface-2 p-4 text-xs text-label" aria-label={caption}>
        {source}
      </pre>
    );
  if (!svg) return <div aria-hidden className="skeleton h-40 rounded-2xl" />;
  return (
    <div
      role="img"
      aria-label={caption}
      className="scroll-thin flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Sanitised Mermaid output (strict mode + DOMPurify), not model-authored HTML.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
