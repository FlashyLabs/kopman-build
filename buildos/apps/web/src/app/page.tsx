import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800/50">
        <span className="text-xl font-bold text-teal-400 tracking-tight">Build OS</span>
        <Link
          href="/auth/signin"
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-4">
          Construction Intelligence Platform
        </p>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Run your renovation<br />
          <span className="text-teal-400">business like a machine.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          AI-powered quoting from photos and video. Automated case studies.
          Referral engine. Loyalty programs. Inventory. Marketing — all in one platform
          built for construction companies that want to scale.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold rounded-xl transition-colors"
          >
            Get started free
          </Link>
          <a
            href="#features"
            className="px-8 py-3.5 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-colors"
          >
            See how it works
          </a>
        </div>
        <p className="text-xs text-gray-600 mt-4">14-day free trial · No credit card required</p>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800/50 py-12">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "< 60s", label: "AI quote from photos" },
            { value: "10x", label: "faster case studies" },
            { value: "3 tiers", label: "loyalty rewards" },
            { value: "∞", label: "markets to roll up" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-teal-400">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">
          Everything a modern renovation company needs
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-100 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-3xl mx-auto px-8 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-gray-400 mb-10">
          Start free. Upgrade when you're ready to scale.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-left">
          {[
            { name: "Starter", price: "$99", desc: "3 users · 25 projects · 20 AI quotes/mo" },
            { name: "Growth", price: "$299", desc: "15 users · 200 projects · Content Machine · Referrals · Loyalty", highlight: true },
            { name: "Enterprise", price: "$999", desc: "Unlimited everything · White-label · Marketplace · Dedicated support" },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-5 ${
                p.highlight
                  ? "border-teal-500/40 bg-teal-500/5"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              {p.highlight && (
                <p className="text-xs font-semibold text-teal-400 mb-1">Most Popular</p>
              )}
              <p className="font-bold text-gray-100">{p.name}</p>
              <p className="text-2xl font-bold text-gray-100 mt-1">
                {p.price}<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <Link
          href="/auth/signin"
          className="inline-block mt-10 px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold rounded-xl transition-colors"
        >
          Start your free trial
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-teal-400 font-bold">Build OS</span>
          <p className="text-xs text-gray-600">
            Built by Kopman Build · Toronto, ON · © {new Date().getFullYear()}
          </p>
          <Link href="/auth/signin" className="text-xs text-gray-500 hover:text-gray-300">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}

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
