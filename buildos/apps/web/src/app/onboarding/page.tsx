import { createContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/root"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function OnboardingPage() {
  const ctx = await createContext()
  if (!ctx) redirect("/auth/signin")

  const caller = appRouter.createCaller(ctx)
  const status = await caller.onboarding.status()

  if (status.isComplete) redirect("/dashboard")

  const steps = [
    { key: "profile", label: "Company profile", href: "/onboarding/profile" },
    { key: "plan", label: "Choose a plan", href: "/settings/billing" },
    { key: "payments", label: "Connect payments", href: "/onboarding/payments" },
    { key: "social", label: "Connect social accounts", href: "/onboarding/social" },
  ] as const

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-400">Welcome to Build OS</h1>
          <p className="text-gray-400 mt-2">
            {status.completedCount} of {status.total} setup steps complete
          </p>
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${(status.completedCount / status.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => {
            const done = status.steps[step.key as keyof typeof status.steps]
            return (
              <Link
                key={step.key}
                href={step.href}
                className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                  done
                    ? "border-gray-800 bg-gray-900 opacity-60 pointer-events-none"
                    : "border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    done ? "bg-teal-500/20 text-teal-400" : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${done ? "text-gray-500" : "text-gray-100"}`}>
                    {step.label}
                  </p>
                </div>
                {!done && <span className="text-teal-400 text-sm">→</span>}
              </Link>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-400">
            Skip for now — go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
