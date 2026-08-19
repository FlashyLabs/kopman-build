// Core domain types shared across apps

export type Role = "owner" | "admin" | "manager" | "field" | "viewer"

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "quoted"
  | "won"
  | "lost"
  | "nurture"

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"

export type ProjectType =
  | "renovation"
  | "basement"
  | "addition"
  | "new_build"
  | "windows"
  | "landscaping"
  | "asphalt"
  | "concrete"
  | "moving"
  | "other"

export interface Tenant {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  plan: "starter" | "growth" | "enterprise"
  createdAt: Date
}

export interface User {
  id: string
  tenantId: string
  flashyId: string          // FlashyID subject claim
  email: string
  name: string
  avatarUrl: string | null
  role: Role
  createdAt: Date
}

export interface Contact {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  source: string | null     // how they found us
  referredById: string | null
  totalSpend: number        // cents
  projectCount: number
  loyaltyPoints: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Lead {
  id: string
  tenantId: string
  contactId: string | null
  assignedToId: string | null
  status: LeadStatus
  projectType: ProjectType
  estimatedValue: number | null   // cents
  notes: string | null
  source: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  tenantId: string
  contactId: string
  leadId: string | null
  assignedToId: string | null
  title: string
  type: ProjectType
  status: ProjectStatus
  contractValue: number           // cents
  paidToDate: number              // cents
  address: string
  startDate: Date | null
  endDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProjectExpense {
  id: string
  projectId: string
  tenantId: string
  category: "labour" | "materials" | "subcontractor" | "equipment" | "permit" | "other"
  description: string
  amount: number           // cents
  date: Date
  receiptUrl: string | null
  createdAt: Date
}

export interface Quote {
  id: string
  tenantId: string
  leadId: string
  contactId: string | null
  title: string
  lineItems: QuoteLineItem[]
  subtotal: number         // cents
  tax: number              // cents
  total: number            // cents
  status: "draft" | "sent" | "accepted" | "declined" | "expired"
  validUntil: Date | null
  notes: string | null
  aiGenerated: boolean
  createdAt: Date
  updatedAt: Date
}

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number        // cents
  total: number            // cents
}

export interface Referral {
  id: string
  tenantId: string
  referrerId: string       // contact who referred
  referredId: string | null // contact who was referred (once they exist)
  leadId: string | null
  status: "pending" | "converted" | "rewarded"
  rewardAmount: number     // cents
  rewardPaidAt: Date | null
  createdAt: Date
}

export interface MediaAsset {
  id: string
  tenantId: string
  projectId: string | null
  leadId: string | null
  url: string
  thumbnailUrl: string | null
  type: "before" | "after" | "progress" | "receipt" | "document"
  mimeType: string
  sizeBytes: number
  aiCaption: string | null
  publishedToSite: boolean
  publishedToSocial: boolean
  createdAt: Date
}

export interface AIQuoteJob {
  id: string
  tenantId: string
  leadId: string
  photoUrls: string[]
  status: "pending" | "processing" | "complete" | "failed"
  rawVisionOutput: unknown | null
  draftQuoteId: string | null
  error: string | null
  createdAt: Date
  completedAt: Date | null
}
