import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-tight">Build</span>
          <span className="text-xl font-bold text-teal-400 tracking-tight">OS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
        </div>
        <Link
          href="/auth/signin"
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest">Now in early access</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
          The operating system<br />
          <span className="text-teal-400">for renovation companies.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI-powered quoting in under 60 seconds. Automated case studies. Referral engine.
          Loyalty programs. Inventory. Marketing. One platform built to help you scale.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-gray-950 font-bold rounded-xl transition-colors text-sm"
          >
            Start free — no credit card
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-colors text-sm"
          >
            See how it works ↓
          </a>
        </div>
        <p className="text-xs text-gray-600 mt-5">14-day free trial · Cancel anytime · Trusted by renovation companies across Canada</p>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-gray-800/50 py-10 bg-gray-900/30">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "< 60s", label: "AI quote from photos" },
            { value: "10×", label: "faster case studies" },
            { value: "$0", label: "egress fees on media" },
            { value: "∞", label: "markets to scale into" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-teal-400">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-8 py-24">
        <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest text-center mb-4">How it works</p>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          From lead to loyal customer — fully automated.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-400">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-gray-100">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed pl-11">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-900/40 border-y border-gray-800/50 py-24">
        <div className="max-w-5xl mx-auto px-8">
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest text-center mb-4">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Everything a modern renovation company needs
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-800 bg-gray-950 p-6 hover:border-gray-700 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-100 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-8 py-24">
        <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest text-center mb-4">Pricing</p>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
        <p className="text-gray-400 text-center mb-12">
          Start free. Upgrade when you&apos;re ready to scale.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                p.highlight
                  ? "border-teal-500/50 bg-teal-500/5 ring-1 ring-teal-500/20"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              {p.highlight && (
                <p className="text-xs font-bold text-teal-400 mb-2 uppercase tracking-widest">Most Popular</p>
              )}
              <p className="font-bold text-lg text-gray-100">{p.name}</p>
              <p className="text-3xl font-bold text-gray-100 mt-2">
                {p.price}<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">{p.desc}</p>
              <Link
                href="/auth/signin"
                className={`mt-6 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
                  p.highlight
                    ? "bg-teal-500 hover:bg-teal-400 text-gray-950"
                    : "border border-gray-700 hover:border-gray-500 text-gray-300"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">All plans include a 14-day free trial. No credit card required.</p>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800/50 bg-gray-900/30 py-24">
        <div className="max-w-2xl mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to run your business<br />like a machine?
          </h2>
          <p className="text-gray-400 mb-8">
            Join renovation companies already using Build OS to quote faster, win more work, and build lasting customer relationships.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-10 py-4 bg-teal-500 hover:bg-teal-400 text-gray-950 font-bold rounded-xl transition-colors"
          >
            Start your free trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-8 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">Build</span>
            <span className="font-bold text-teal-400">OS</span>
          </div>
          <p className="text-xs text-gray-600">
            buildos.com · © {new Date().getFullYear()} · Built for the trades.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/auth/signin" className="hover:text-gray-300 transition-colors">Sign in</Link>
            <a href="mailto:hello@buildos.com" className="hover:text-gray-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

const HOW_IT_WORKS = [
  {
    title: "Capture the job",
    description: "Upload photos or walk through on video. Build OS extracts scope, materials, and labour automatically.",
  },
  {
    title: "Quote in 60 seconds",
    description: "Claude Vision generates a full itemized quote with line items, quantities, and margins — ready to send.",
  },
  {
    title: "Win, deliver, retain",
    description: "Case studies publish themselves. Referral rewards go out automatically. Loyalty points keep customers coming back.",
  },
]

const FEATURES = [
  {
    icon: "📸",
    title: "AI Quote from Photos",
    description:
      "Upload job site photos or a video walkthrough. Get a full itemized quote in under 60 seconds, powered by Claude Vision.",
  },
  {
    icon: "🏗️",
    title: "Project Intelligence",
    description:
      "Track every project's P&L in real time — contract value, expenses by category, margin, and outstanding balance.",
  },
  {
    icon: "📣",
    title: "Content Machine",
    description:
      "Before/after photos automatically become case studies, FAQ entries, Instagram captions, and Google Business posts.",
  },
  {
    icon: "🎁",
    title: "Referral Engine",
    description:
      "Reward customers who send you business. Tiered cash rewards ($250–$1,000) paid automatically on conversion.",
  },
  {
    icon: "⭐",
    title: "Loyalty Program",
    description:
      "Bronze to Platinum tiers. Points for every dollar spent, every review, every referral. Redeemable against future work.",
  },
  {
    icon: "📦",
    title: "Inventory & Ordering",
    description:
      "Track materials across projects. Low-stock alerts. AI-suggested reorder quantities based on upcoming job load.",
  },
  {
    icon: "📧",
    title: "Marketing Automation",
    description:
      "Nurture sequences, win-back campaigns, post-completion review requests — all AI-personalized and auto-sent.",
  },
  {
    icon: "🏪",
    title: "Lead Marketplace",
    description:
      "Buy overflow leads from other contractors. Sell leads you can't service. Commission-based, instant payout.",
  },
  {
    icon: "🏢",
    title: "White-label & Roll-up",
    description:
      "Acquire smaller competitors and run them on Build OS under your brand. One platform, multiple markets.",
  },
]

const PLANS = [
  {
    name: "Starter",
    price: "$99",
    desc: "3 users · 25 projects/mo · 20 AI quotes/mo · Core quoting and project tracking",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$299",
    desc: "15 users · 200 projects/mo · Content Machine · Referral Engine · Loyalty Program · Marketing Automation",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$999",
    desc: "Unlimited everything · White-label · Lead Marketplace · Dedicated support · Custom integrations",
    highlight: false,
  },
]
