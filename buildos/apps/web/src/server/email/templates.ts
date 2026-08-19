/**
 * Email templates via Resend (transactional) + React Email (templates)
 * All sends are fire-and-forget — wrap in .catch(() => null) at call site
 */

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? "Kopman Build <hello@kopman.build>"

// ── Referral Emails ────────────────────────────────────────────────────────

export async function sendReferralInviteEmail(opts: {
  to: string
  referrerName: string
  referralId: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Thanks for the referral, " + opts.referrerName + "! 🏠",
    html: `
      <p>Hi ${opts.referrerName},</p>
      <p>We got your referral — thank you! When they complete their project with us,
      you'll earn a reward automatically. We'll keep you posted.</p>
      <p>In the meantime, you can track your referrals and points anytime in your account.</p>
      <p>— The Kopman Build Team</p>
    `,
  })
}

export async function sendReferralRewardEmail(opts: {
  to: string
  referrerName: string
  rewardAmount: number   // cents
  paymentMethod: "etransfer" | "cheque" | "credit"
}) {
  const amount = `$${(opts.rewardAmount / 100).toFixed(0)}`
  const methodText =
    opts.paymentMethod === "etransfer"
      ? "via e-transfer to this email"
      : opts.paymentMethod === "cheque"
      ? "by cheque in the mail"
      : "as a credit toward your next project"

  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your referral reward — ${amount} is on its way!`,
    html: `
      <p>Hi ${opts.referrerName},</p>
      <p>Great news — your referral converted into a project! Your <strong>${amount} reward</strong>
      is being sent ${methodText}.</p>
      <p>Keep the referrals coming — every completed project earns you a reward.</p>
      <p>— The Kopman Build Team</p>
    `,
  })
}

// ── Project Milestone Emails ───────────────────────────────────────────────

export async function sendProjectStartEmail(opts: {
  to: string
  contactName: string
  projectTitle: string
  startDate: string
  assignedTo: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your project is starting — ${opts.projectTitle}`,
    html: `
      <p>Hi ${opts.contactName},</p>
      <p>We're kicking off <strong>${opts.projectTitle}</strong> on <strong>${opts.startDate}</strong>.</p>
      <p>Your project lead is <strong>${opts.assignedTo}</strong>. They'll be in touch shortly with
      site access details and a schedule.</p>
      <p>You'll receive updates at key milestones throughout the project.</p>
      <p>— The Kopman Build Team</p>
    `,
  })
}

export async function sendProjectCompleteEmail(opts: {
  to: string
  contactName: string
  projectTitle: string
  reviewLink: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your project is complete — ${opts.projectTitle}`,
    html: `
      <p>Hi ${opts.contactName},</p>
      <p>Your <strong>${opts.projectTitle}</strong> is complete. It was a pleasure working with you.</p>
      <p>If you're happy with how everything turned out, a Google review goes a long way for a
      small business like ours — and we'll add <strong>200 loyalty points</strong> to your account
      as a thank-you.</p>
      <p><a href="${opts.reviewLink}" style="background:#14B8A6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Leave a Review</a></p>
      <p>Also — if you know anyone else looking for renovation work, your referral earns you up to
      $1,000 depending on the project size.</p>
      <p>— The Kopman Build Team</p>
    `,
  })
}

// ── Quote Emails ───────────────────────────────────────────────────────────

export async function sendQuoteEmail(opts: {
  to: string
  contactName: string
  quoteTitle: string
  total: number   // cents
  quoteUrl: string
  validUntil: string
}) {
  const total = `$${(opts.total / 100).toLocaleString("en-CA")}`

  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your quote from Kopman Build — ${total}`,
    html: `
      <p>Hi ${opts.contactName},</p>
      <p>Your quote for <strong>${opts.quoteTitle}</strong> is ready.</p>
      <p>Total: <strong>${total} CAD</strong><br/>Valid until: ${opts.validUntil}</p>
      <p><a href="${opts.quoteUrl}" style="background:#14B8A6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">View Quote</a></p>
      <p>Questions? Reply to this email or call us — we're happy to walk through anything.</p>
      <p>— The Kopman Build Team</p>
    `,
  })
}

// ── Nurture Sequence ───────────────────────────────────────────────────────

export async function sendNurtureEmail(opts: {
  to: string
  contactName: string
  sequenceStep: 1 | 2 | 3
}) {
  const steps = {
    1: {
      subject: "Thinking about renovating? Here's where to start",
      html: `
        <p>Hi ${opts.contactName},</p>
        <p>Whether you're planning a basement finish, kitchen update, or full addition —
        the hardest part is usually knowing where to start.</p>
        <p>We put together a quick checklist of the 5 things to figure out before
        calling a contractor. Happy to send it over.</p>
        <p>— Kopman Build</p>
      `,
    },
    2: {
      subject: "Recent project: $85K basement conversion in Leslieville",
      html: `
        <p>Hi ${opts.contactName},</p>
        <p>We just wrapped a full basement conversion in Leslieville — legal suite, separate entrance,
        full bath. Total: $85,000. Took 9 weeks from permit to handover.</p>
        <p>If that's the kind of project you're considering, I'd love to give you a proper walkthrough
        of the scope and realistic costs.</p>
        <p>— Kopman Build</p>
      `,
    },
    3: {
      subject: "Still thinking it over?",
      html: `
        <p>Hi ${opts.contactName},</p>
        <p>No pressure — but if you're still weighing options, we're happy to do a
        free 20-minute consultation to look at your space and give you a ballpark before
        you commit to anything.</p>
        <p>Just reply to this email and we'll find a time.</p>
        <p>— Kopman Build</p>
      `,
    },
  }

  const step = steps[opts.sequenceStep]
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: step.subject,
    html: step.html,
  })
}
