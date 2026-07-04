"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";

export function OccupancyGauge({ rate }: { rate: number }) {
  const data = [{ name: "occupation", value: rate, fill: "var(--primary)" }];

  return (
    <div className="relative flex h-32 items-center justify-center">
      <RadialBarChart
        width={140}
        height={140}
        cx={70}
        cy={70}
        innerRadius={50}
        outerRadius={68}
        barSize={12}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={8} />
      </RadialBarChart>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold">{rate}%</span>
        <span className="text-[10px] text-muted-foreground">occupation</span>
      </div>
    </div>
  );
}
