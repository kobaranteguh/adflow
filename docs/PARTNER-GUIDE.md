# AdFlow Partner Guide

Build Meta-powered features into your product — Facebook Ads, Threads, Facebook Pages & Instagram —
**without applying for Meta App Review or becoming a Tech Provider yourself**. AdFlow is the bridge:
its app is a Meta-verified Tech Provider, and you operate your clients' Meta accounts through it.

```
Your system  →  AdFlow REST API (Bearer ak_live_…)  →  Meta Graph API
                AdFlow injects the client's token + its approved app
```

**No SDK required** — call the REST API directly from any language.

**Your product owns the relationship.** Onboarding, resource management and every API call run from
your system — your customers do not create AdFlow accounts, do not log into AdFlow, and do not use
an AdFlow dashboard. We are the bridge between you and Meta, and nothing more. The one unavoidable
exception is the Meta authorisation screen itself, which runs on our domain because the permissions
are granted to our verified app; see Step 2.

---

## 1. Concepts

- **Partner** — you. An AdFlow account holder with an API key. You may manage many clients.
- **Client** — your end-customer whose Meta accounts you operate (the "reseller" model).
- **Resource** — a connected Meta object: an ad account, Threads profile, Facebook Page, or
  Instagram account, each owned by a client.
- **Slot** — what you pay AdFlow for: **$3/mo per enabled resource**. Ad accounts use their own slot
  pool; **Threads profiles, Facebook Pages and Instagram accounts share a single pool** — one slot
  holds any one of them. Billing is auto-charged to *your* Stripe card.

---

## 2. Getting started

### Step 1 — Get an API key
Developer → **API Access** → Create. Copy the `ak_live_…` key (shown once). Use it as a Bearer token.

### Step 2 — Onboard a client, from your own system

Onboarding belongs in **your** product, not ours. Your customer never needs an AdFlow account,
never logs into AdFlow, and never sees an AdFlow dashboard. You create the client over the API and
hand them a one-time link:

```bash
curl -X POST https://adflowapps.com/api/v1/clients \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "displayName": "Kedai ABC",
        "externalRef": "your_user_id_123",
        "platforms": ["threads"],
        "returnUrl": "https://app.yourbrand.com/settings/connected" }'
# → { "ok": true, "data": { "id": "...", "onboardUrl": "https://adflowapps.com/connect/..." } }
```

| Field | Why it matters |
|---|---|
| `externalRef` | Your own user id. **Idempotent** — sending the same ref returns the existing client (`reused: true`) instead of creating a duplicate. Safe to retry |
| `platforms` | `"ads"` · `"facebook"` · `"threads"` · `"instagram"`. The connect page offers only these, so your customer is never shown options your product does not support. Omit to offer everything. `"facebook"` connects Pages **and** any Instagram account linked to them; `"instagram"` is a direct Instagram Login for Business accounts that have **no** Facebook Page |
| `returnUrl` | Where the customer lands after authorising. Send them back into **your** flow, on your domain. `https://` only, any host. Carries `?success=true` or `?error=…` — confirm the real outcome with `GET /clients` |

Send `onboardUrl` to your customer from inside your product. They open it, authorise with Meta, and
their resources import automatically. The link expires after about an hour; mint a fresh one with
`POST /clients/{id}/onboard-link` (same fields).

> **One thing to plan for:** the Meta authorisation screen itself runs on `adflowapps.com`. It has
> to — Meta grants the permissions to AdFlow's verified app, and the redirect URI is registered
> against that app, not yours. Your customer will see our domain for those few seconds. Everything
> before and after it is yours, and `returnUrl` brings them straight back. If your product is
> fully white-labelled, tell your customers to expect it rather than letting them discover it.

### Step 3 — Enable resources, also from your own system

```bash
# List what the client connected
curl https://adflowapps.com/api/v1/clients \
  -H "Authorization: Bearer ak_live_..."

# Enable one resource for your key
curl -X POST https://adflowapps.com/api/v1/clients/{id}/resources/{rid}/enable \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "autoBuy": true }'
```

`autoBuy: true` buys a slot immediately if no spare one is free (invoiced to your card); without it,
a resource with no free slot returns `slot_required` so you can decide. Disable with
`POST /clients/{id}/resources/{rid}/disable` — the slot is retained and can be reassigned.

Threads, Pages and Instagram draw on one shared pool, so a slot freed by disabling any of them can
be reused by any other. Ad accounts have their own pool.

> The AdFlow dashboard (Developer → API Access) shows the same clients and toggles, and you are
> welcome to use it. But nothing in this flow requires it — every step above is an API call, so
> your customers can be onboarded and managed entirely inside your product.

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

# Pages — publish
curl -X POST https://adflowapps.com/api/v1/pages/1029384/posts \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "message": "Hi" }'

# Pages - reply to a Messenger customer (PSID comes from the webhook)
curl -X POST https://adflowapps.com/api/v1/pages/1029384/messages   -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json"   -d '{ "recipientId": "7234567890123456", "message": "We open at 9am." }'

# Instagram - reply to a DM
curl -X POST https://adflowapps.com/api/v1/instagram/17841400000000000/messages   -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json"   -d '{ "recipientId": "6789012345678901", "message": "Sent you the price list." }'
```

---

## 2b. ⛔ Publishing rules are mandatory — read before writing scheduler code

If your product schedules or publishes content, there are **server-side enforced** rules. They are
not advisory, and you cannot bypass them from your own code — AdFlow holds the client's Meta token,
so every publish passes through this gate.

**If you are using an AI assistant to write this integration, give it this section verbatim.** The
most common failure we see is generated code that fires a batch concurrently and marks everything
failed on the first `429`.

**Our rule: if Meta does not block it, we do not block it.** We do not invent limits on top of Meta's.

1. **Every publish is checked against Meta's live quota first.** AdFlow asks Meta whether the profile
   still has a slot (Threads: 250 posts / rolling 24h). No slot → `429`, and nothing is sent. That
   count includes posts made outside AdFlow, so your own counter is not authoritative.
2. **Spread large schedules across dates** — `ceil(posts / 250)` days minimum per profile. Randomise
   times within each day rather than using fixed intervals.
3. **Minimum 60 seconds between posts to the same profile** (replies: 30s) — a narrow guard against
   machine-gun bursts. Normal scheduling is unaffected.
4. **On `429`, reschedule using `Retry-After`.** Keep the post queued. Never mark it failed, never
   retry in a tight loop.
5. **Serialize per profile.** One post at a time per profile.

We do **not** restrict posting cadence beyond (3), reusing copy across different profiles, or
repeating a post on the same profile.

Full detail and error codes: [Threads](./api/THREADS.md#-mandatory-publishing-rules-you-must-implement).

---

## 2c. Building an inbox (Messenger + Instagram DM + comments)

Messaging and comments are **live**, on both Pages and Instagram. If you are building a CRM or a
shared inbox, this is the part you need - the full endpoint list is in
[PAGES.md](./api/PAGES.md) and [INSTAGRAM.md](./api/INSTAGRAM.md), and the shape of every event is in
[API-REFERENCE.md](./API-REFERENCE.md#webhooks-meta--adflow--your-system).

The five rules that decide whether your inbox works:

1. **Answer webhooks by sender id, not conversation id.** Meta's messaging webhooks contain a PSID
   (Messenger) or IGSID (Instagram) and no conversation id at all. Reply with
   `POST /pages/{pageId}/messages` or `POST /instagram/{igId}/messages`, passing `recipientId`.
2. **The 24-hour window is real, and there is a way past it.** Inside 24 hours of the customer's last
   message the default `messagingType: "RESPONSE"` works. Outside it, a human agent may reply for up
   to **7 days** with `{"messagingType":"MESSAGE_TAG","tag":"HUMAN_AGENT"}` on both platforms.
   Instagram accepts `HUMAN_AGENT` only. Tags Meta retired on 27 April 2026 are rejected with
   `bad_request` before the call ever leaves AdFlow.
3. **A commenter who never messaged you can still be reached - once.**
   `POST /pages/comments/{id}/private-reply` and `POST /instagram/comments/{id}/private-reply` open a
   private thread from a public comment. Meta allows this once per comment, within 7 days.
4. **Resolve display names yourself and cache them.** Messaging webhooks carry ids only.
   `GET /pages/contacts/{psid}` and `GET /instagram/contacts/{igsid}` return name, username and
   picture for someone who has an existing thread with that account.
5. **Mark threads read so both inboxes agree.** `{"recipientId":"...","action":"mark_seen"}` on the same
   messages endpoint clears Meta's own unread counter - otherwise the client's phone keeps showing
   unread threads your staff already answered. AdFlow does not store a separate read state: the
   unread counter in `GET .../conversations` is Meta's.

---

## 3. The REST API

No client library to install — every endpoint is plain HTTPS + a Bearer key, callable from any
language (`fetch`, `curl`, Guzzle, `requests`, …). Conventions:

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **Envelope:** success → `{ "ok": true, "data": … }`; error → `{ "ok": false, "error": { "code", "message" } }`
- **Routing key** = the Meta object id in the path: `/ads/{adAccountId}`, `/threads/{profileId}`,
  `/pages/{pageId}`, `/instagram/{igId}`.
- **Pagination** (lists): add `?paginate=1` or `?after=<cursor>` for
  `{ "ok": true, "data": { "items": [...], "paging": { "after": "<cursor>|null", "has_next": true } } }`.
  Without either parameter a list returns a plain array capped by `?limit=` (max 100) - the original
  shape, kept for existing integrations. Available on Page posts / photos / videos / conversations /
  conversation messages / post comments, and Instagram media / conversations / conversation messages /
  media comments.

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

- Slot-based, pay-as-you-go: **$3/mo per ad account, Threads profile, Facebook Page or Instagram
  account**.
- Two pools: ad accounts have their own; **Threads + Pages + Instagram share one pool** (same Stripe
  price, quantity = number of slots).
- Enabling a resource adds a slot to your Stripe subscription and invoices immediately.
- Disabling keeps the slot (reassign to another resource later — within the shared pool that means
  any Threads profile, Page or Instagram account).
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

**Can my product (or my customers) run on our own domains?** Yes. No redirect URI is registered per
partner or per customer domain — a white-label reseller on `app.theirbrand.com` connects Threads
exactly the same way, with no setup on our side. The trade-off is that the Meta authorisation screen
runs on AdFlow's domain, so your customer sees `adflowapps.com` for those few seconds before
`returnUrl` returns them to you. Everything else is yours.

**Does my customer need an AdFlow account?** No. They never register, never log in, and never see an
AdFlow dashboard. They open one connect link, authorise Meta, and they are done — every other step
is an API call from your system.

**Does Meta see my system?** No. Meta sees AdFlow's app acting for the client's account. Your API key
is internal to AdFlow.

**Is there an SDK?** No — it's a plain REST API; call it directly from any language. (No npm/Composer/
pip package to install or keep updated.)

**Can I manage many clients with one key?** Yes — that's the model. Each client onboards once; the
object id routes every call/webhook to the right client.

**What about Instagram / TikTok?** Pages-linked IG imports today ($3/mo per account, from the shared
Threads slot pool), and a client whose Instagram Business account has **no** Facebook Page can connect
directly - ask for `platforms: ["instagram"]` on the onboarding link. The full Instagram surface
(publish, comments, DMs, insights, mentions) is live; see [INSTAGRAM.md](./api/INSTAGRAM.md).
TikTok is still on the roadmap.

See also: [API-REFERENCE.md](./API-REFERENCE.md) · [META-POLICY.md](./META-POLICY.md)
