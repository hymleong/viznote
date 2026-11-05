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
      <pre className="overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-800" aria-label={caption}>
        {source}
      </pre>
    );
  if (!svg) return <div className="h-40 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />;
  return (
    <div
      role="img"
      aria-label={caption}
      className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Sanitised Mermaid output (strict mode + DOMPurify), not model-authored HTML.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
