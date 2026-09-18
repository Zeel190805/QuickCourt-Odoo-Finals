"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7"]

const AXIS = { stroke: "#94a3b8", fontSize: 12, tickLine: false, axisLine: false } as const
const GRID = { stroke: "#e2e8f0", strokeDasharray: "4 4", vertical: false } as const
const ANIM = { isAnimationActive: true, animationDuration: 900, animationEasing: "ease-out" as const }

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px -12px rgba(0,0,0,0.25)",
    fontSize: 12,
  },
}

interface Series {
  key: string
  label?: string
  color?: string
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[300px]">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function AnimatedLineChart({
  data,
  xKey,
  series,
  height = 300,
  emptyLabel = "No data available",
}: {
  data: any[]
  xKey: string
  series: Series[]
  height?: number
  emptyLabel?: string
}) {
  if (!data?.length) return <Empty label={emptyLabel} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label || s.key}
            stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            {...ANIM}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AnimatedAreaChart({
  data,
  xKey,
  series,
  height = 300,
  emptyLabel = "No data available",
}: {
  data: any[]
  xKey: string
  series: Series[]
  height?: number
  emptyLabel?: string
}) {
  if (!data?.length) return <Empty label={emptyLabel} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color || CHART_COLORS[i % CHART_COLORS.length]
            return (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                <stop offset="95%" stopColor={color} stopOpacity={0.03} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip {...tooltipStyle} />
        {series.map((s, i) => {
          const color = s.color || CHART_COLORS[i % CHART_COLORS.length]
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label || s.key}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#grad-${s.key})`}
              {...ANIM}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AnimatedBarChart({
  data,
  xKey,
  bars,
  height = 300,
  emptyLabel = "No data available",
  tooltipFormatter,
}: {
  data: any[]
  xKey: string
  bars: Series[]
  height?: number
  emptyLabel?: string
  tooltipFormatter?: (value: any) => [string, string]
}) {
  if (!data?.length) return <Empty label={emptyLabel} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {bars.map((b, i) => {
            const color = b.color || CHART_COLORS[i % CHART_COLORS.length]
            return (
              <linearGradient key={b.key} id={`bar-${b.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip {...tooltipStyle} formatter={tooltipFormatter} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.label || b.key} fill={`url(#bar-${b.key})`} radius={[6, 6, 0, 0]} {...ANIM} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AnimatedDonut({
  data,
  height = 300,
  emptyLabel = "No data available",
}: {
  data: Array<{ name: string; value: number; color?: string }>
  height?: number
  emptyLabel?: string
}) {
  if (!data?.length) return <Empty label={emptyLabel} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          {...ANIM}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
