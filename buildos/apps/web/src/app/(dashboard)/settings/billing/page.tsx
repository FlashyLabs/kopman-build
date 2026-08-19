import { createContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/root"
import { redirect } from "next/navigation"

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string }
}) {
  const ctx = await createContext()
  if (!ctx) redirect("/auth/signin")

  const caller = appRouter.createCaller(ctx)
  const [overview, plans] = await Promise.all([
    caller.billing.overview(),
    caller.onboarding.plans(),
  ])

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      cents / 100
    )

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Billing</h1>

      {searchParams.success && (
        <div className="mb-6 rounded-xl bg-teal-500/10 border border-teal-500/30 px-4 py-3 text-sm text-teal-400">
          Subscription activated — welcome to Build OS {overview.planName}!
        </div>
      )}

      {/* Current plan */}
      <section className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Plan</p>
            <p className="text-2xl font-bold text-gray-100">{overview.planName}</p>
            <p className="text-gray-400 mt-1">{fmt(overview.monthlyUsd)} / month</p>
            {overview.subscriptionStatus && (
              <p className="text-xs text-gray-500 mt-2">
                Status: <span className="text-teal-400">{overview.subscriptionStatus}</span>
                {overview.currentPeriodEnd && (
                  <> · Renews {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(overview.currentPeriodEnd)}</>
                )}
              </p>
            )}
          </div>
          {overview.stripeCustomerId && (
            <ManageButton />
          )}
        </div>
      </section>

      {/* Plan cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Plans
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === overview.plan
            return (
              <div
                key={plan.key}
                className={`rounded-xl border p-5 flex flex-col ${
                  plan.popular
                    ? "border-teal-500/40 bg-teal-500/5"
                    : isCurrent
                    ? "border-gray-700 bg-gray-900"
                    : "border-gray-800 bg-gray-900"
                }`}
              >
                {plan.popular && (
                  <span className="text-xs font-semibold text-teal-400 mb-2">Most Popular</span>
                )}
                <p className="text-lg font-bold text-gray-100">{plan.name}</p>
                <p className="text-2xl font-bold text-gray-100 mt-1">
                  ${plan.priceMonthly}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
                <ul className="mt-4 space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-teal-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isCurrent ? (
                    <span className="text-xs text-gray-500">Current plan</span>
                  ) : (
                    <UpgradeButton planKey={plan.key} label={plan.priceMonthly > (overview.monthlyUsd / 100) ? "Upgrade" : "Downgrade"} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// Client components for interactive billing actions
function ManageButton() {
  return (
    <form action="/api/billing/portal" method="POST">
      <button
        type="submit"
        className="text-sm text-gray-400 hover:text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
      >
        Manage subscription
      </button>
    </form>
  )
}

function UpgradeButton({ planKey, label }: { planKey: string; label: string }) {
  return (
    <form action={`/api/billing/checkout?plan=${planKey}`} method="POST">
      <button
        type="submit"
        className="w-full text-sm font-medium bg-teal-500 hover:bg-teal-400 text-gray-950 rounded-lg px-3 py-2 transition-colors"
      >
        {label}
      </button>
    </form>
  )
}
