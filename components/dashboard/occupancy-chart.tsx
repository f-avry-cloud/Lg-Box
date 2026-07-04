"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { OccupancyPoint } from "@/lib/business/occupancy";

export function OccupancyChart({ data }: { data: OccupancyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="occupancyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="var(--muted-foreground)"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}%`, "Occupation"]}
        />
        <Area type="monotone" dataKey="rate" stroke="var(--primary)" fill="url(#occupancyFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
