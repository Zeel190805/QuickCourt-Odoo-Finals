"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { AppContainer } from "@/components/app-container"
import { FadeIn, Stagger, HoverCard } from "@/components/motion"
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

const steps = [
  { n: "01", title: "Discover venues", desc: "Browse sports facilities near you with photos, sports, and day/night rates." },
  { n: "02", title: "Pick a 3-hour slot", desc: "Choose from fixed 3-hour blocks — 00:00, 03:00, 06:00 … with real-time availability." },
  { n: "03", title: "Book & pay", desc: "Confirm instantly. Get email confirmation and manage bookings from your dashboard." },
  { n: "04", title: "Show up & play", desc: "Arrive at your court, check in, and enjoy your session hassle-free." },
]

const benefits = [
  { icon: Clock, title: "3-hour slot system", desc: "Clean scheduling with no hourly clutter. Every slot is exactly 3 hours." },
  { icon: MapPin, title: "Multi-sport venues", desc: "Badminton, tennis, squash, and more — all in one platform." },
  { icon: Sparkles, title: "Day & night pricing", desc: "Owners set separate rates for day (6 AM–6 PM) and night sessions." },
  { icon: Shield, title: "Secure booking", desc: "Atomic slot locking prevents double bookings. Your slot is guaranteed." },
  { icon: TrendingUp, title: "Owner analytics", desc: "Venue owners get revenue charts, peak hours, and booking trends." },
  { icon: Users, title: "Built for everyone", desc: "Players book easily. Owners manage facilities. Admins oversee the platform." },
]

export function PublicLanding() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <AppContainer className="flex h-16 items-center justify-between">
          <Link href="/"><Logo size="md" /></Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#benefits" className="hover:text-indigo-600">Benefits</a>
            <a href="#how-it-works" className="hover:text-indigo-600">How it works</a>
            <a href="#features" className="hover:text-indigo-600">Features</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link href="/auth/signup"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Get Started</Button></Link>
          </div>
        </AppContainer>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white pt-16 pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-200/30 blur-3xl" />
        </div>
        <AppContainer className="text-center">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" /> Sports facility booking, reimagined
            </span>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
              Book courts.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Play more.
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.16}>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              CourtX connects players with premium sports venues. Real-time 3-hour slots, transparent pricing, and a seamless booking experience.
            </p>
          </FadeIn>
          <FadeIn delay={0.24}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25">
                  Start booking free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/venues">
                <Button size="lg" variant="outline" className="h-12 px-8">Explore venues</Button>
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.32}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { v: "500+", l: "Courts listed" },
                { v: "3hr", l: "Slot blocks" },
                { v: "24/7", l: "Online booking" },
                { v: "100%", l: "Instant confirm" },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{v}</div>
                  <div className="text-sm text-slate-500 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </AppContainer>
      </section>

      <section id="benefits" className="py-20 bg-slate-50">
        <AppContainer>
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Why teams choose CourtX</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto">Everything you need to find, book, and manage sports facility sessions — without phone calls or spreadsheets.</p>
          </FadeIn>
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <HoverCard key={title} className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-lg transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </HoverCard>
            ))}
          </Stagger>
        </AppContainer>
      </section>

      <section id="how-it-works" className="py-20">
        <AppContainer>
          <FadeIn className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How booking works</h2>
            <p className="mt-4 text-slate-600">Four simple steps from search to court time.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.08}>
                <div className="relative rounded-2xl border bg-white p-6 h-full">
                  <span className="text-4xl font-black text-indigo-100">{step.n}</span>
                  <h3 className="mt-2 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </AppContainer>
      </section>

      <section id="features" className="py-20 bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
        <AppContainer>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl font-bold">Built like a SaaS platform</h2>
              <p className="mt-4 text-indigo-100/80 text-lg">
                Role-based dashboards for players, venue owners, and admins. Animated analytics, OTP-secured admin login, and production-ready booking flows.
              </p>
              <ul className="mt-8 space-y-4">
                {["Player dashboard with booking history", "Owner panel with revenue charts", "Admin moderation & user management", "Email confirmations on every booking"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-indigo-100">
                    <CalendarCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.12}>
              <Card className="bg-white/10 border-white/10 backdrop-blur-sm text-white">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    <span className="font-medium">Trusted by facility owners</span>
                  </div>
                  <p className="text-indigo-100/90 text-sm leading-relaxed">
                    &ldquo;CourtX cut our manual booking work in half. The 3-hour slot system is exactly what our courts needed.&rdquo;
                  </p>
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-sm text-indigo-200">Ready to list your venue?</span>
                    <Link href="/auth/signup">
                      <Button size="sm" variant="secondary">Register as owner</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </AppContainer>
      </section>

      <section className="py-20">
        <AppContainer>
          <FadeIn className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-14 sm:px-14 text-center text-white">
            <Zap className="h-10 w-10 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl sm:text-4xl font-bold">Your next game is one click away</h2>
            <p className="mt-4 text-indigo-100 max-w-xl mx-auto">Join CourtX today and book your first court in under a minute.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup"><Button size="lg" variant="secondary" className="h-12 px-8">Create free account</Button></Link>
              <Link href="/venues"><Button size="lg" variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10 bg-transparent">Browse venues</Button></Link>
            </div>
          </FadeIn>
        </AppContainer>
      </section>

      <footer className="border-t bg-slate-50 py-12">
        <AppContainer className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" />
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} CourtX. Sports facility booking platform.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/venues" className="hover:text-indigo-600">Venues</Link>
            <Link href="/auth/login" className="hover:text-indigo-600">Login</Link>
            <Link href="/auth/signup" className="hover:text-indigo-600">Sign up</Link>
          </div>
        </AppContainer>
      </footer>
    </div>
  )
}
