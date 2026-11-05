"use client";
import { useEffect, useState } from "react";
import type { BlockOf } from "@/lib/blocks/schema";

type Token = { content: string; color?: string };

/** Shiki tokens rendered as React spans: no generated HTML is injected. */
export function CodeBlock({ block }: { block: BlockOf<"code"> }) {
  const [lines, setLines] = useState<Token[][] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToTokens } = await import("shiki");
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const res = await codeToTokens(block.code, {
          lang: block.language.toLowerCase() as never,
          theme: dark ? "github-dark" : "github-light",
        });
        if (!cancelled) setLines(res.tokens.map((l) => l.map((t) => ({ content: t.content, color: t.color }))));
      } catch {
        if (!cancelled) setLines(block.code.split("\n").map((l) => [{ content: l }]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [block.code, block.language]);

  const notes = new Map(block.annotations.map((a) => [a.line, a.note]));
  const rows: Token[][] = lines ?? block.code.split("\n").map((l) => [{ content: l }]);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse font-mono text-xs">
        <tbody>
          {rows.map((tokens, i) => (
            <tr key={i} className={notes.has(i + 1) ? "bg-indigo-50 dark:bg-indigo-950/40" : undefined}>
              <td className="select-none px-2 text-right text-zinc-400">{i + 1}</td>
              <td className="whitespace-pre px-2">
                {tokens.map((t, j) => (
                  <span key={j} style={{ color: t.color }}>
                    {t.content}
                  </span>
                ))}
              </td>
              <td className="px-3 py-0.5 font-sans text-zinc-600 dark:text-zinc-300">{notes.get(i + 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
