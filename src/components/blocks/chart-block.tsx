"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BlockOf } from "@/lib/blocks/schema";

/** Apple system palette. */
const COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff453a", "#bf5af2"];
const TICK = { fontSize: 12 };

export function ChartBlock({ block }: { block: BlockOf<"chart"> }) {
  const data = block.rows.map((r) => ({
    label: r.label,
    ...Object.fromEntries(block.series.map((s, i) => [s, r.values[i]])),
  }));
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="label"
        tick={TICK}
        axisLine={false}
        tickLine={false}
        label={{ value: block.x_label, position: "insideBottom", offset: -4, fontSize: 12 }}
      />
      <YAxis
        tick={TICK}
        axisLine={false}
        tickLine={false}
        label={{ value: block.y_label, angle: -90, position: "insideLeft", fontSize: 12 }}
      />
      <Tooltip
        contentStyle={{
          background: "var(--vz-surface)",
          border: "1px solid var(--vz-separator)",
          borderRadius: 12,
          color: "var(--vz-label)",
          boxShadow: "var(--vz-shadow-raised)",
        }}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
    </>
  );
  return (
    <figure>
      {/* Grid and axis text follow the colour tokens via CSS (SVG attributes can't hold var()). */}
      <div
        className="h-72 w-full [&_.recharts-cartesian-axis-tick-value]:fill-label-2 [&_.recharts-cartesian-grid_line]:stroke-separator [&_.recharts-label]:fill-label-2"
        role="img"
        aria-label={block.caption}
      >
        <ResponsiveContainer>
          {block.chart_type === "line" ? (
            <LineChart data={data}>
              {axes}
              {block.series.map((s, i) => (
                <Line key={s} dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} />
              ))}
            </LineChart>
          ) : block.chart_type === "area" ? (
            <AreaChart data={data}>
              {axes}
              {block.series.map((s, i) => (
                <Area
                  key={s}
                  dataKey={s}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.18}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data}>
              {axes}
              {block.series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 text-footnote text-label-2">{block.caption}</figcaption>
    </figure>
  );
}
