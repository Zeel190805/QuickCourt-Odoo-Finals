import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function AppContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10", className)}>
      {children}
    </div>
  )
}
