import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";

type UsageRow = {
  id: string;
  lecture_id: string;
  lecture_title: string;
  version: number;
  status: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  model_usage: { pass: string; model: string; input_tokens: number; output_tokens: number }[];
  created_at: string;
};

/** Token usage per generation, recorded by the pipeline (RLS: your own generations only). */
export default async function UsagePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generation_usage")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as UsageRow[];
  const fmt = (n: number) => n.toLocaleString();

  return (
    <AppShell>
      <PageHeader eyebrow="Admin" title="Token usage" description="Per-generation model usage, including prompt-cache reads and writes." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-container-low text-left text-xs font-medium tracking-wide text-on-surface-variant uppercase">
            <tr>
              <th className="px-4 py-3">Lecture</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right tabular-nums">Input</th>
              <th className="px-4 py-3 text-right tabular-nums">Cache read</th>
              <th className="px-4 py-3 text-right tabular-nums">Cache write</th>
              <th className="px-4 py-3 text-right tabular-nums">Output</th>
              <th className="px-4 py-3 text-right tabular-nums">Passes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-outline-variant/40 transition-colors hover:bg-on-surface/4">
                <td className="px-4 py-3">
                  <Link href={`/lectures/${r.lecture_id}`} className="font-medium text-primary hover:underline">
                    {r.lecture_title}
                  </Link>
                </td>
                <td className="px-4 py-3">v{r.version}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "complete" ? "good" : r.status === "failed" ? "bad" : "info"} className="capitalize">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(r.input_tokens)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(r.cache_read_tokens)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(r.cache_write_tokens)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(r.output_tokens)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.model_usage.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-on-surface-variant">No generations yet.</p>}
      </Card>
    </AppShell>
  );
}
