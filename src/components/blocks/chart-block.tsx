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

const COLORS = ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#a142f4"];

export function ChartBlock({ block }: { block: BlockOf<"chart"> }) {
  const data = block.rows.map((r) => ({
    label: r.label,
    ...Object.fromEntries(block.series.map((s, i) => [s, r.values[i]])),
  }));
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
      <XAxis dataKey="label" label={{ value: block.x_label, position: "insideBottom", offset: -4 }} />
      <YAxis label={{ value: block.y_label, angle: -90, position: "insideLeft" }} />
      <Tooltip />
      <Legend />
    </>
  );
  return (
    <figure>
      <div className="h-72 w-full" role="img" aria-label={block.caption}>
        <ResponsiveContainer>
          {block.chart_type === "line" ? (
            <LineChart data={data}>
              {axes}
              {block.series.map((s, i) => (
                <Line key={s} dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
              ))}
            </LineChart>
          ) : block.chart_type === "area" ? (
            <AreaChart data={data}>
              {axes}
              {block.series.map((s, i) => (
                <Area key={s} dataKey={s} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
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
      <figcaption className="mt-2 text-sm text-zinc-500">{block.caption}</figcaption>
    </figure>
  );
}
