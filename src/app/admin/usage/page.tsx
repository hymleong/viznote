import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/primitives";

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
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Modules
      </Link>
      <h1 className="text-2xl font-bold">Token usage</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="p-3">Lecture</th>
              <th className="p-3">Version</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Input</th>
              <th className="p-3 text-right">Cache read</th>
              <th className="p-3 text-right">Cache write</th>
              <th className="p-3 text-right">Output</th>
              <th className="p-3 text-right">Passes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="p-3">
                  <Link href={`/lectures/${r.lecture_id}`} className="hover:underline">
                    {r.lecture_title}
                  </Link>
                </td>
                <td className="p-3">v{r.version}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-right">{fmt(r.input_tokens)}</td>
                <td className="p-3 text-right">{fmt(r.cache_read_tokens)}</td>
                <td className="p-3 text-right">{fmt(r.cache_write_tokens)}</td>
                <td className="p-3 text-right">{fmt(r.output_tokens)}</td>
                <td className="p-3 text-right">{r.model_usage.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-zinc-500">No generations yet.</p>}
      </Card>
    </main>
  );
}
