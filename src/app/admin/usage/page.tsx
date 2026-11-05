import type { Metadata } from "next";
import Link from "next/link";
import { Gauge } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Token usage" };

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
  const sum = (key: "input_tokens" | "cache_read_tokens" | "cache_write_tokens" | "output_tokens") =>
    rows.reduce((total, r) => total + (r[key] ?? 0), 0);
  const stats = [
    { label: "Input tokens", value: sum("input_tokens") },
    { label: "Cache read", value: sum("cache_read_tokens") },
    { label: "Cache write", value: sum("cache_write_tokens") },
    { label: "Output tokens", value: sum("output_tokens") },
  ];

  return (
    <main className="rise mx-auto w-full max-w-6xl space-y-8 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        eyebrow="Admin"
        title="Token usage"
        description={`Across your ${rows.length} most recent generation${rows.length === 1 ? "" : "s"}.`}
      />

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="list">
        {stats.map((s) => (
          <li key={s.label}>
            <Card className="space-y-1">
              <p className="text-footnote font-medium text-label-2">{s.label}</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-label">{fmt(s.value)}</p>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="overflow-hidden p-0 sm:p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Gauge aria-hidden />}
            title="No generations yet"
            description="Usage appears here once you generate a study page."
            className="m-4 border-0"
          />
        ) : (
          <div tabIndex={0} role="region" aria-labelledby="usage-caption" className="scroll-thin max-h-[70vh] overflow-auto">
            <table className="w-full text-subhead">
              <caption id="usage-caption" className="sr-only">
                Token usage per generation
              </caption>
              <thead className="glass sticky top-0 z-10 text-left text-footnote text-label-2">
                <tr className="border-b border-separator">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Lecture
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Version
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Input
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Cache read
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Cache write
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Output
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Passes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator tabular-nums">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors duration-200 hover:bg-fill/50">
                    <td className="px-5 py-3">
                      <Link href={`/lectures/${r.lecture_id}`} className="font-medium text-accent hover:underline">
                        {r.lecture_title}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge>v{r.version}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={r.status === "complete" ? "good" : r.status === "failed" ? "bad" : "neutral"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-label">{fmt(r.input_tokens)}</td>
                    <td className="px-5 py-3 text-right text-label">{fmt(r.cache_read_tokens)}</td>
                    <td className="px-5 py-3 text-right text-label">{fmt(r.cache_write_tokens)}</td>
                    <td className="px-5 py-3 text-right text-label">{fmt(r.output_tokens)}</td>
                    <td className="px-5 py-3 text-right text-label-2">{r.model_usage.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
