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
import { billingRouter } from "./routers/billing"
import { onboardingRouter } from "./routers/onboarding"
import { marketplaceRouter } from "./routers/marketplace"
import { videoQuotesRouter } from "./routers/video-quotes"
import { whiteLabelRouter } from "./routers/white-label"
import { intelligenceRouter } from "./routers/intelligence"

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
  billing: billingRouter,
  onboarding: onboardingRouter,
  marketplace: marketplaceRouter,
  videoQuotes: videoQuotesRouter,
  whiteLabel: whiteLabelRouter,
  intelligence: intelligenceRouter,
})

export type AppRouter = typeof appRouter
