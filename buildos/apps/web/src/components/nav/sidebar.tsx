"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Camera,
  Gift,
  Package,
  Megaphone,
  Settings,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Briefcase },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/projects", label: "Projects", icon: Building2 },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/media", label: "Media", icon: Camera },
  { href: "/referrals", label: "Referrals", icon: Gift },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
]

interface Props {
  user: { name?: string | null; email?: string | null; role: string }
}

export function Sidebar({ user }: Props) {
  const path = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
      <div className="px-5 py-5 border-b border-gray-800">
        <span className="text-lg font-bold text-teal-400 tracking-tight">Build OS</span>
        <p className="text-xs text-gray-500 mt-0.5">by Kopman Build</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
        <p className="text-xs text-gray-500 truncate">{user.role}</p>
      </div>
    </aside>
  )
}
