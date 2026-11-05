"use client";
import { useMemo } from "react";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BlockOf } from "@/lib/blocks/schema";

const EDGE_STYLE: Record<string, { stroke: string; dash?: string }> = {
  "is-a": { stroke: "#0b57d0" },
  "part-of": { stroke: "#12b5cb" },
  causes: { stroke: "#e37400" },
  "contrasts-with": { stroke: "#d93025", dash: "6 4" },
  "prerequisite-for": { stroke: "#188038" },
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
        borderColor: "#0b57d0",
        borderRadius: 14,
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

  return (
    <figure>
      <div className="h-[420px] w-full rounded-2xl border border-outline-variant/60" role="img" aria-label={block.caption}>
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} nodesConnectable={false}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <figcaption className="mt-2 text-sm text-zinc-500">{block.caption}</figcaption>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {block.nodes
          .filter((n) => n.importance >= 2)
          .map((n) => (
            <div key={n.id} className="text-sm">
              <dt className="font-semibold">{n.label}</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{n.definition}</dd>
            </div>
          ))}
      </dl>
    </figure>
  );
}
