"use client";
import { useState, useTransition } from "react";
import { approveBlock, deleteBlock, editBlock, regenerateBlock } from "@/app/review-actions";
import { Button } from "@/components/ui/button";
import { Badge, Input, Textarea } from "@/components/ui/primitives";
import type { BlockRow } from "@/lib/types";

/**
 * Per-block review: approve, edit inline (schema-validated JSON editor),
 * regenerate with an optional instruction, delete. Edits and regenerations
 * create new versions; earlier versions are kept.
 */
export function ReviewControls({ row }: { row: BlockRow }) {
  const [mode, setMode] = useState<"idle" | "edit" | "regen">("idle");
  const [draft, setDraft] = useState("");
  const [instruction, setInstruction] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErrors([e instanceof Error ? e.message : String(e)]);
      }
    });

  return (
    <div className="space-y-2 border-t border-outline-variant/40 pt-3">
      <div className="flex flex-wrap items-center gap-1">
        {row.review_status !== "pending" && (
          <Badge tone="good">{row.review_status === "approved" ? "Approved" : "Edited"}</Badge>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => approveBlock(row.id))}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setDraft(JSON.stringify(row.data, null, 2));
            setErrors([]);
            setMode(mode === "edit" ? "idle" : "edit");
          }}
        >
          Edit
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setMode(mode === "regen" ? "idle" : "regen")}>
          Regenerate
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteBlock(row.id))}>
          Delete
        </Button>
        {note && (
          <span role="status" className="text-xs text-zinc-500">
            {note}
          </span>
        )}
      </div>

      {mode === "edit" && (
        <div className="space-y-2">
          <Textarea
            aria-label="Edit block JSON"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-64 font-mono text-xs"
          />
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(async () => {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(draft);
                } catch {
                  setErrors(["Not valid JSON"]);
                  return;
                }
                const res = await editBlock(row.id, parsed);
                if (res.ok) {
                  setMode("idle");
                  setNote("Saved as a new version.");
                } else setErrors(res.errors);
              })
            }
          >
            Save version
          </Button>
        </div>
      )}

      {mode === "regen" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await regenerateBlock(row.id, instruction);
              setMode("idle");
              setNote("Regenerating. The new version will appear here.");
            });
          }}
        >
          <Input
            aria-label="Regeneration instruction"
            placeholder='Optional: "simpler", "add an example"'
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <Button size="sm" type="submit" disabled={pending}>
            Go
          </Button>
        </form>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-xs text-error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
