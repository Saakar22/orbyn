"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

type Point = { month: string; revenueMinor: number };

/** Monthly revenue. The last bar is the month in progress, drawn lighter so it isn't read as a drop. */
export function RevenueChart({ data, currency = "USD", partialLabel }: { data: Point[]; currency?: string; partialLabel: string }) {
  const last = data.length - 1;
  return (
    <div
      className="h-64 w-full lg:h-full lg:min-h-64"
      role="img"
      aria-label={`Monthly revenue: ${data.map((d, i) => `${d.month}${i === last ? ` (${partialLabel})` : ""} ${formatMoney(d.revenueMinor, currency)}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="34%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: string, index: number) => (index === last ? `${value}*` : value)}
          />
          <YAxis
            width={48}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => formatMoney(value, currency, { compact: true })}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-overlay">
                  <div className="text-muted-foreground">
                    {label}
                    {label === data[last]?.month ? `, ${partialLabel}` : ""}
                  </div>
                  <div className="tabular mt-0.5 text-sm font-semibold">{formatMoney(Number(payload[0].value), currency)}</div>
                  <div className="text-muted-foreground">Net of refunds</div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="revenueMinor" radius={[5, 5, 0, 0]} maxBarSize={44}>
            {data.map((_, index) => (
              <Cell key={index} fill="var(--chart-1)" fillOpacity={index === last ? 0.38 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
