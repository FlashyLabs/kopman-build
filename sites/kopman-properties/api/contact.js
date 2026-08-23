// Vercel serverless function — receives contact enquiries and forwards them by email.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   API key from resend.com
//   CONTACT_TO       destination inbox, e.g. hello@kopman.properties
//   CONTACT_FROM     verified sender on your domain, e.g. "Kopman Group <site@kopman.properties>"
//
// If the environment is not configured the endpoint returns an honest error and the
// front end tells the visitor to email directly. It never reports a false success.

const FIELDS = ['name', 'company', 'email', 'phone', 'topic', 'address', 'size', 'message', 'source'];
const LIMITS = { name: 120, company: 160, email: 200, phone: 60, topic: 80, address: 200, size: 40, message: 5000, source: 60 };

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Malformed request.' });
  }

  // Honeypot: real visitors never fill this. Accept silently so bots learn nothing.
  if (String(body.company_website || '').trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const data = {};
  for (const f of FIELDS) data[f] = String(body[f] ?? '').trim().slice(0, LIMITS[f] || 500);

  if (data.name.length < 2)      return res.status(400).json({ ok: false, error: 'Please enter your name.' });
  if (!isEmail(data.email))      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  if (data.message.length < 5)   return res.status(400).json({ ok: false, error: 'Please include a message.' });

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('contact: missing RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res.status(503).json({ ok: false, error: 'The enquiry form is not configured yet.' });
  }

  const rows = [
    ['Name', data.name], ['Company', data.company], ['Email', data.email],
    ['Phone', data.phone], ['Enquiry type', data.topic],
    ['Property address', data.address], ['Approx. size (SF)', data.size],
    ['Source', data.source || 'kopman.properties'],
  ].filter(([, v]) => v);

  const html =
    `<h2 style="font-family:Georgia,serif;margin:0 0 16px">New enquiry — ${esc(data.source || 'kopman.properties')}</h2>` +
    `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">` +
    rows.map(([k, v]) =>
      `<tr><td style="padding:6px 16px 6px 0;color:#6b675f">${esc(k)}</td>` +
      `<td style="padding:6px 0"><strong>${esc(v)}</strong></td></tr>`).join('') +
    `</table><hr style="border:0;border-top:1px solid #d8d3c8;margin:20px 0">` +
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(data.message)}</div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: data.email,
        subject: `Kopman Properties enquiry — ${data.topic || 'General'} — ${data.name}`,
        html,
      }),
    });

    if (!r.ok) {
      console.error('contact: resend responded', r.status, await r.text().catch(() => ''));
      return res.status(502).json({ ok: false, error: 'We could not send that just now.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: send failed', err);
    return res.status(502).json({ ok: false, error: 'We could not send that just now.' });
  }
}
