import { auth } from "@/lib/auth"
import { createContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/root"

export default async function DashboardPage() {
  const ctx = await createContext()
  const caller = appRouter.createCaller(ctx!)

  const [projectStats, pipeline] = await Promise.all([
    caller.projects.dashboard(),
    caller.leads.pipeline(),
  ])

  const pipelineMap = Object.fromEntries(pipeline.map((r) => [r.status, r]))
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
      cents / 100
    )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Dashboard</h1>

      {/* Project KPIs */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Projects
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active" value={String(projectStats?.active ?? 0)} />
          <StatCard label="Planning" value={String(projectStats?.planning ?? 0)} />
          <StatCard label="Completed" value={String(projectStats?.completed ?? 0)} />
          <StatCard
            label="Total Contract Value"
            value={fmt(projectStats?.totalContractValue ?? 0)}
            highlight
          />
        </div>
      </section>

      {/* Lead Pipeline */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Lead Pipeline
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["new", "contacted", "qualified", "quoted"].map((status) => {
            const row = pipelineMap[status]
            return (
              <StatCard
                key={status}
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                value={String(row?.count ?? 0)}
                sub={row?.totalValue ? fmt(row.totalValue) : undefined}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 border ${highlight ? "border-teal-500/30 bg-teal-500/5" : "border-gray-800 bg-gray-900"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-teal-400" : "text-gray-100"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
