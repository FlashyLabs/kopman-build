import { router } from "@/lib/trpc/server"
import { leadsRouter } from "./routers/leads"
import { contactsRouter } from "./routers/contacts"
import { projectsRouter } from "./routers/projects"
import { aiRouter } from "./routers/ai"
import { mediaRouter } from "./routers/media"
import { contentRouter } from "./routers/content"
import { referralsRouter } from "./routers/referrals"
import { loyaltyRouter } from "./routers/loyalty"
import { marketingRouter } from "./routers/marketing"
import { inventoryRouter } from "./routers/inventory"
import { quotesRouter } from "./routers/quotes"

export const appRouter = router({
  leads: leadsRouter,
  contacts: contactsRouter,
  projects: projectsRouter,
  ai: aiRouter,
  media: mediaRouter,
  content: contentRouter,
  referrals: referralsRouter,
  loyalty: loyaltyRouter,
  marketing: marketingRouter,
  inventory: inventoryRouter,
  quotes: quotesRouter,
})

export type AppRouter = typeof appRouter
