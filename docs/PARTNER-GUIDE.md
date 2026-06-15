# AdFlow Partner Guide

Build Meta-powered features into your product — Facebook Ads, Threads, Facebook Pages & Instagram —
**without applying for Meta App Review or becoming a Tech Provider yourself**. AdFlow is the bridge:
its app is a Meta-verified Tech Provider, and you operate your clients' Meta accounts through it.

```
Your system  →  AdFlow API (Bearer ak_live_…)  →  Meta Graph API
                AdFlow injects the client's token + its approved app
```

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
```js
const { AdFlow } = require('@adflow/sdk');
const adflow = new AdFlow({ apiKey: process.env.ADFLOW_API_KEY });

const client = await adflow.clients.create({ displayName: 'Kedai ABC' });
// Send client.onboardUrl to your client (email, in-app, etc.)
```
Your client opens the link (no AdFlow login needed), picks what to connect (Ads / Pages & Instagram /
Threads), and authorises with Meta. Their resources import automatically under the client.

### Step 3 — Enable resources
In Developer → API Access → Clients, toggle each resource on. Ads/Threads buy a slot (invoiced to
your card immediately); Pages/IG are free.

### Step 4 — Call the API
```js
// Ads
await adflow.account('act_123').createCampaign({ name: 'Q3', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED' });
const stats = await adflow.account('act_123').insights({ date_preset: 'last_30d', breakdown: 'platform' });

// Threads
await adflow.profile('17841400000000000').publish({ mediaType: 'TEXT', text: 'Hello' });

// Pages (free)
await adflow.page('1029384').createPost({ message: 'Hi' });
```

---

## 3. SDKs

| Language | Install | Client |
| -------- | ------- | ------ |
| Node.js  | `npm install @adflow/sdk` | `new AdFlow({ apiKey })` |
| PHP      | `composer require adflow/sdk` | `new AdFlow\Sdk\AdFlow(['apiKey' => …])` |
| Python   | `pip install adflow-sdk` | `AdFlow(api_key="…")` |

Every SDK exposes the same surface:
- `clients` — `create({displayName})` → `onboardUrl`, `list()`, `get(id)`, `delete(id)`
- `account(adAccountId)` — campaigns, ad sets, ads, insights, audiences, pixels
- `profile(threadsId)` — publish, posts, insights
- `page(pageId)` — posts, comments, conversations, insights (free)
- `request(method, path, …)` — escape hatch for any endpoint
- Errors throw `AdFlowError` with `.code` + `.status`.

**PHP**
```php
use AdFlow\Sdk\AdFlow;
$adflow = new AdFlow(['apiKey' => getenv('ADFLOW_API_KEY')]);
$adflow->account('act_123')->createCampaign(['name'=>'Q3','objective'=>'OUTCOME_TRAFFIC','status'=>'PAUSED']);
```

**Python**
```python
from adflow_sdk import AdFlow
adflow = AdFlow(api_key="ak_live_…")
adflow.account("act_123").create_campaign(name="Q3", objective="OUTCOME_TRAFFIC", status="PAUSED")
```

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

- `AdFlowError.code`: `unauthorized`, `slot_required`, `api_not_enabled`, `rate_limited`,
  `not_found`, `bad_request`, `upstream_error`.
- 120 req/min per key (AdFlow). Handle `rate_limited` with backoff (`Retry-After`).
- Meta's own limits apply globally to AdFlow's app — see [META-POLICY.md](./META-POLICY.md).

```js
const { AdFlowError } = require('@adflow/sdk');
try { await adflow.account('act_1').campaigns(); }
catch (e) {
  if (e instanceof AdFlowError && e.code === 'rate_limited') { /* wait & retry */ }
  else throw e;
}
```

---

## 7. FAQ

**Do I need Meta App Review?** No — AdFlow's verified Tech Provider app covers the calls.

**Does Meta see my system?** No. Meta sees AdFlow's app acting for the client's account. Your API key
is internal to AdFlow.

**Can I manage many clients with one key?** Yes — that's the model. Each client onboards once; the
object id routes every call/webhook to the right client.

**What about Instagram / TikTok?** Pages-linked IG imports free today; standalone IG & TikTok
endpoints are coming soon.

See also: [API-REFERENCE.md](./API-REFERENCE.md) · [META-POLICY.md](./META-POLICY.md)
