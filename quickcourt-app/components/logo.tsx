import { cn } from "@/lib/utils"

type LogoSize = "sm" | "md" | "lg" | "xl"

const sizeMap: Record<LogoSize, { court: string; x: string }> = {
  sm: { court: "text-base", x: "text-xl" },
  md: { court: "text-xl", x: "text-3xl" },
  lg: { court: "text-3xl", x: "text-5xl" },
  xl: { court: "text-4xl", x: "text-6xl" },
}

export function Logo({ size = "md", className }: { size?: LogoSize; className?: string }) {
  const s = sizeMap[size]
  return (
    <span className={cn("inline-flex items-baseline select-none", className)}>
      <span className={cn("font-semibold tracking-tight text-slate-700", s.court)}>Court</span>
      <span className={cn("font-display font-black text-black leading-none -ml-0.5", s.x)}>X</span>
    </span>
  )
}
