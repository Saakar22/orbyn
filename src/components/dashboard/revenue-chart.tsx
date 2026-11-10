"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

type Point = { month: string; revenueMinor: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`Monthly revenue: ${data.map((d) => `${d.month} ${formatMoney(d.revenueMinor)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="38%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => formatMoney(value, "USD", { compact: true })}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="tabular font-semibold">{formatMoney(Number(payload[0].value))}</div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="revenueMinor" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
