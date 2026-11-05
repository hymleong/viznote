"use client";
import { useMemo } from "react";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BlockOf } from "@/lib/blocks/schema";

/** Apple system palette, one hue per relation. */
const EDGE_STYLE: Record<string, { stroke: string; dash?: string }> = {
  "is-a": { stroke: "#5e5ce6" },
  "part-of": { stroke: "#0a84ff" },
  causes: { stroke: "#ff9f0a" },
  "contrasts-with": { stroke: "#ff453a", dash: "6 4" },
  "prerequisite-for": { stroke: "#30d158" },
};

/** Layered layout: prerequisite/cause edges push targets one level down. */
function layout(block: BlockOf<"concept_map">) {
  const level = new Map(block.nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < block.nodes.length; i++) {
    for (const e of block.edges) {
      if (e.relation === "contrasts-with") continue;
      const [parent, child] =
        e.relation === "is-a" || e.relation === "part-of" ? [e.to, e.from] : [e.from, e.to];
      const next = (level.get(parent) ?? 0) + 1;
      if ((level.get(child) ?? 0) < next && next < block.nodes.length) level.set(child, next);
    }
  }
  const rows = new Map<number, string[]>();
  for (const n of block.nodes) {
    const l = level.get(n.id) ?? 0;
    rows.set(l, [...(rows.get(l) ?? []), n.id]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [l, ids] of rows)
    ids.forEach((id, i) => pos.set(id, { x: (i - (ids.length - 1) / 2) * 220, y: l * 130 }));
  return pos;
}

export function ConceptMap({ block }: { block: BlockOf<"concept_map"> }) {
  const { nodes, edges } = useMemo(() => {
    const pos = layout(block);
    const nodes: Node[] = block.nodes.map((n) => ({
      id: n.id,
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      data: { label: n.label },
      ariaLabel: `${n.label}: ${n.definition}`,
      style: {
        width: 150 + n.importance * 15,
        fontWeight: n.importance === 3 ? 700 : 500,
        fontSize: 12,
        borderWidth: n.importance,
        borderColor: "var(--vz-accent-fill)",
        borderRadius: 14,
        background: "var(--vz-surface)",
        color: "var(--vz-label)",
        boxShadow: "var(--vz-shadow-card)",
      },
    }));
    const edges: Edge[] = block.edges.map((e, i) => {
      const s = EDGE_STYLE[e.relation];
      return {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        label: e.relation,
        labelStyle: { fontSize: 10 },
        style: { stroke: s.stroke, strokeDasharray: s.dash },
        markerEnd: { type: MarkerType.ArrowClosed, color: s.stroke },
      };
    });
    return { nodes, edges };
  }, [block]);

  const used = new Set(block.edges.map((e) => e.relation));

  return (
    <figure>
      <div
        className="h-[440px] w-full overflow-hidden rounded-2xl border border-separator"
        role="img"
        aria-label={block.caption}
      >
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} nodesConnectable={false}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {used.size > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-footnote text-label-2">
          {Object.entries(EDGE_STYLE)
            .filter(([rel]) => used.has(rel as (typeof block.edges)[number]["relation"]))
            .map(([rel, s]) => (
              <li key={rel} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.stroke }} />
                {rel}
              </li>
            ))}
        </ul>
      )}
      <figcaption className="mt-2 text-footnote text-label-2">{block.caption}</figcaption>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {block.nodes
          .filter((n) => n.importance >= 2)
          .map((n) => (
            <div key={n.id} className="rounded-xl bg-surface-2 p-3 text-subhead">
              <dt className="font-semibold text-label">{n.label}</dt>
              <dd className="mt-0.5 text-label-2">{n.definition}</dd>
            </div>
          ))}
      </dl>
    </figure>
  );
}
