"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { FadeIn } from "@/components/motion"
import { CheckCircle2, Shield, Zap } from "lucide-react"

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white p-10 xl:p-14 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-violet-500 blur-3xl" />
        </div>
        <FadeIn className="relative z-10">
          <Link href="/"><Logo size="lg" className="[&_span:first-child]:text-white" /></Link>
        </FadeIn>
        <FadeIn delay={0.1} className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">{title}</h1>
          <p className="text-indigo-100/90 text-lg">{subtitle}</p>
          <ul className="space-y-4 pt-4">
            {[
              { icon: Zap, text: "Book courts in seconds with live availability" },
              { icon: Shield, text: "Secure payments and instant confirmations" },
              { icon: CheckCircle2, text: "Day & night pricing on every venue" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-indigo-100">
                <Icon className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </FadeIn>
        <p className="relative z-10 text-xs text-indigo-200/60">© {new Date().getFullYear()} CourtX. All rights reserved.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/"><Logo size="md" /></Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
