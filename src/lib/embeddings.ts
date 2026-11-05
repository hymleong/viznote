import "server-only";
import { env } from "@/lib/env";

/** Embedding provider behind an interface (Anthropic has no embeddings endpoint). */
export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
}

class VoyageEmbeddings implements EmbeddingProvider {
  readonly dimensions = 1024;
  constructor(private apiKey: string) {}

  async embed(texts: string[], kind: "document" | "query") {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 64) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: "voyage-3.5",
          input: texts.slice(i, i + 64),
          input_type: kind,
          output_dimension: this.dimensions,
        }),
      });
      if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
      const json = (await res.json()) as { data: { embedding: number[] }[] };
      out.push(...json.data.map((d) => d.embedding));
    }
    return out;
  }
}

/** Returns null when no provider is configured; callers skip embedding. */
export function getEmbeddingProvider(): EmbeddingProvider | null {
  const key = env.voyageApiKey();
  return key ? new VoyageEmbeddings(key) : null;
}

export const toPgVector = (v: number[]) => JSON.stringify(v);
