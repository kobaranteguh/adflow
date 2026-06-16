# AdFlow Partner Guide

Build Meta-powered features into your product — Facebook Ads, Threads, Facebook Pages & Instagram —
**without applying for Meta App Review or becoming a Tech Provider yourself**. AdFlow is the bridge:
its app is a Meta-verified Tech Provider, and you operate your clients' Meta accounts through it.

```
Your system  →  AdFlow REST API (Bearer ak_live_…)  →  Meta Graph API
                AdFlow injects the client's token + its approved app
```

**No SDK required** — call the REST API directly from any language.

---

## 1. Concepts

- **Partner** — you. An AdFlow account holder with an API key. You may manage many clients.
- **Client** — your end-customer whose Meta accounts you operate (the "reseller" model).
- **Resource** — a connected Meta object: an ad account, Threads profile, Facebook Page, or
  Instagram account, each owned by a client.
- **Slot** — what you pay AdFlow for: $2/mo per enabled ad account, $1/mo per enabled Threads
  profile. **Pages & Instagram are free.** Billing is auto-charged to *your* Stripe card.

---

## 2. Getting started

### Step 1 — Get an API key
Developer → **API Access** → Create. Copy the `ak_live_…` key (shown once). Use it as a Bearer token.

### Step 2 — Onboard a client
Create a client and share its connect link:
```bash
curl -X POST https://adflowapps.com/api/v1/clients \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "displayName": "Kedai ABC" }'
# → { "ok": true, "data": { "id": "...", "onboardUrl": "https://adflowapps.com/connect/..." } }
```
Send `onboardUrl` to your client. They open it (no AdFlow login needed), pick what to connect
(Ads / Pages & Instagram / Threads), and authorise with Meta. Their resources import automatically.

### Step 3 — Enable resources
In Developer → API Access → Clients, toggle each resource on. Ads/Threads buy a slot (invoiced to
your card immediately); Pages/IG are free.

### Step 4 — Call the API
```bash
# Ads — create a campaign
curl -X POST https://adflowapps.com/api/v1/ads/act_123/campaigns \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "name": "Q3", "objective": "OUTCOME_TRAFFIC", "status": "PAUSED" }'

# Ads — insights
curl "https://adflowapps.com/api/v1/ads/act_123/insights?date_preset=last_30d&breakdown=platform" \
  -H "Authorization: Bearer ak_live_..."

# Threads — publish
curl -X POST https://adflowapps.com/api/v1/threads/17841400000000000/posts \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "media_type": "TEXT", "text": "Hello" }'

# Pages (free) — publish
curl -X POST https://adflowapps.com/api/v1/pages/1029384/posts \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "message": "Hi" }'
```

---

## 3. The REST API

No client library to install — every endpoint is plain HTTPS + a Bearer key, callable from any
language (`fetch`, `curl`, Guzzle, `requests`, …). Conventions:

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **Envelope:** success → `{ "ok": true, "data": … }`; error → `{ "ok": false, "error": { "code", "message" } }`
- **Routing key** = the Meta object id in the path: `/ads/{adAccountId}`, `/threads/{profileId}`,
  `/pages/{pageId}`, `/instagram/{igId}`.
- **Pagination** (lists): add `?paginate=1` or `?after=<cursor>` → `{ items, paging: { after, has_next } }`.

Full endpoint references per platform:
- [Marketing API (Ads)](./api/MARKETING.md) — campaigns, ad sets, ads, creatives, media, audiences,
  targeting, insights, pixels, Conversions API, lead ads, scheduled reports
- [Threads](./api/THREADS.md) · [Facebook Pages](./api/PAGES.md) · [Instagram](./api/INSTAGRAM.md)

---

## 4. Webhooks

Receive Meta events (new comment, message, lead…) in your system:
1. Developer → API Access → Webhooks → add your `https://` callback (optionally filter by platform).
2. AdFlow gives you a signing secret.
3. On each event AdFlow POSTs the Meta payload to you with `X-AdFlow-Signature` — verify it (see
   [API-REFERENCE.md](./API-REFERENCE.md#webhooks-meta--adflow--your-system)).
4. Return `2xx`. Failures retry with backoff.

Routing: each event names the Meta object id → AdFlow maps it to the owning client → relays only to
you. With many clients/systems, events never cross owners.

---

## 5. Billing

- Slot-based, pay-as-you-go: **$2/mo per ad account, $1/mo per Threads profile**, Pages + IG free.
- Enabling a paid resource adds a slot to your Stripe subscription and invoices immediately.
- Disabling keeps the slot (reassign to another resource later).
- You (the partner) pay AdFlow; how you charge your own clients is up to you.

---

## 6. Errors & rate limits

- `error.code`: `unauthorized`, `slot_required`, `api_not_enabled`, `rate_limited`, `not_found`,
  `bad_request`, `upstream_error`. Full table in [API-REFERENCE.md](./API-REFERENCE.md).
- 120 req/min per key (AdFlow). On `429 rate_limited`, back off and retry.
- Meta's own limits apply globally to AdFlow's app — see [META-POLICY.md](./META-POLICY.md).

```jsonc
// HTTP 429
{ "ok": false, "error": { "code": "rate_limited", "message": "Slow down — 120 req/min per key." } }
```

---

## 7. FAQ

**Do I need Meta App Review?** No — AdFlow's verified Tech Provider app covers the calls.

**Does Meta see my system?** No. Meta sees AdFlow's app acting for the client's account. Your API key
is internal to AdFlow.

**Is there an SDK?** No — it's a plain REST API; call it directly from any language. (No npm/Composer/
pip package to install or keep updated.)

**Can I manage many clients with one key?** Yes — that's the model. Each client onboards once; the
object id routes every call/webhook to the right client.

**What about Instagram / TikTok?** Pages-linked IG imports free today; standalone IG & TikTok
endpoints are on the roadmap.

See also: [API-REFERENCE.md](./API-REFERENCE.md) · [META-POLICY.md](./META-POLICY.md)
