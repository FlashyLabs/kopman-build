import { router } from "@/lib/trpc/server"
import { leadsRouter } from "./routers/leads"
import { contactsRouter } from "./routers/contacts"
import { projectsRouter } from "./routers/projects"
import { aiRouter } from "./routers/ai"

export const appRouter = router({
  leads: leadsRouter,
  contacts: contactsRouter,
  projects: projectsRouter,
  ai: aiRouter,
})

export type AppRouter = typeof appRouter
