import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { SYSTEM_PROMPT } from "./prompts";

export const MODELS = {
  synthesis: "claude-sonnet-5-5",
  chunk: "claude-haiku-5-5",
} as const;
export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/** Per-pass output caps (cost control). */
export const MAX_TOKENS = {
  outline: 12_000,
  section: 12_000,
  synthesis: 16_000,
  repair: 6_000,
} as const;

let client: Anthropic | null = null;
function anthropic() {
  // API key comes from ANTHROPIC_API_KEY. It is server-side only and never shipped to the browser.
  client ??= new Anthropic();
  return client;
}

export type PassUsage = {
  pass: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
};

export type SourceContent = Anthropic.Beta.BetaContentBlockParam[];

export class LlmError extends Error {}

/**
 * One structured call. The source material is sent first, after a stable system
 * prompt, with a cache breakpoint, so every pass reuses the same cached prefix.
 */
export async function structuredCall<S extends z.ZodType>(args: {
  pass: string;
  model: ModelId;
  source: SourceContent;
  instructions: string;
  schema: S;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
}): Promise<{ data: z.infer<S>; usage: PassUsage }> {
  const isSonnet = args.model === MODELS.synthesis;
  const res = await anthropic().beta.messages.parse({
    model: args.model,
    max_tokens: args.maxTokens,
    system: [{ type: "text", text: SYSTEM_PROMPT }],
    messages: [
      {
        role: "user",
        content: [...args.source, { type: "text", text: args.instructions }],
      },
    ],
    output_config: {
      format: betaZodOutputFormat(args.schema),
      effort: args.effort ?? "medium",
    },
    // Server-side refusal fallback (Claude API, Sonnet only; Haiku has none).
    ...(isSonnet
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });

  const usage: PassUsage = {
    pass: args.pass,
    model: res.model,
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    cache_read_input_tokens: res.usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: res.usage.cache_creation_input_tokens ?? 0,
  };

  if (res.stop_reason === "refusal") throw new LlmError(`${args.pass}: model declined the request`);
  if (res.stop_reason === "max_tokens")
    throw new LlmError(`${args.pass}: hit the ${args.maxTokens} output-token cap`);
  if (res.parsed_output == null) throw new LlmError(`${args.pass}: no parsable output`);

  return { data: res.parsed_output as z.infer<S>, usage };
}

/** Marks the last source block as the cache breakpoint. */
export function withCacheBreakpoint(source: SourceContent): SourceContent {
  if (source.length === 0) return source;
  const last = source[source.length - 1];
  if (last.type === "text" || last.type === "image") {
    return [...source.slice(0, -1), { ...last, cache_control: { type: "ephemeral" } }];
  }
  return source;
}
