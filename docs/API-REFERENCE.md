# AdFlow Bridge API — Reference

Complete reference for the AdFlow partner REST API (`/api/v1`). AdFlow is a **bridge**: your system
calls AdFlow with an API key; AdFlow uses its own Meta-App-Review-approved access (verified **Tech
Provider**) to call the Meta Graph API on behalf of your onboarded clients and returns the result.

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth header:** `Authorization: Bearer ak_live_…`
- **Content type:** `application/json`

> **No SDK** — this is a plain REST API; call it directly from any language. See
> [PARTNER-GUIDE.md](./PARTNER-GUIDE.md) for a quickstart and [api/](./api/) for per-platform references.

---

## Conventions

### Response envelope
Success:
```json
{ "ok": true, "data": { /* ... */ } }
```
Error:
```json
{ "ok": false, "error": { "code": "slot_required", "message": "…" } }
```

### Error codes
| HTTP | code | meaning |
| ---- | ---- | ------- |
| 401 | `unauthorized` | missing / invalid / revoked key |
| 403 | `forbidden` | key not scoped for this platform |
| 403 | `api_not_enabled` | the resource isn't enabled for the API |
| 402 | `slot_required` | enabling needs a paid slot |
| 402 | `billing_not_configured` | Stripe price/subscription missing |
| 404 | `not_found` | resource not found among your clients |
| 400 | `bad_request` | bad/missing parameters |
| 429 | `rate_limited` | >120 req/min on this key (`Retry-After` header) |
| 502 | `upstream_error` | the Meta Graph call failed |

### Identifiers
Ad accounts accept `act_123` or `123`. Endpoints not nested under a resource take a context query
param so the right token can be resolved: `?accountId=` (ads sub-resources), `?pageId=` (page
sub-resources), `?profileId=` (Threads post insights).

### Rate limits
120 requests/minute per API key (AdFlow-side, protects the shared Meta quota). On exceed → `429` with
`Retry-After`. Meta's own app/BUC limits also apply globally — see [META-POLICY.md](./META-POLICY.md).

---

## Clients (reseller onboarding)

### `POST /clients`
Create a client and get an onboarding link to share. The client opens it and authorises AdFlow's app;
their ad accounts, Pages & Instagram import automatically.

Body: `{ "displayName": "Kedai ABC", "externalRef": "optional-your-id", "returnUrl": "https://app.yourbrand.com/threads/connected", "platforms": ["threads"] }`
```json
{ "ok": true, "data": { "id": "clt_…", "displayName": "Kedai ABC", "onboardUrl": "https://adflowapps.com/connect/obs_…", "reused": false } }
```

**Send `externalRef`** — your own id for that client. The call is then idempotent: a repeat with the
same `externalRef` returns the existing client (`reused: true`, status `200`) with a fresh
`onboardUrl`, instead of creating a duplicate. Without it, every call creates a new client row, so a
"Connect" button that fires on each click piles up hundreds of empty clients. A new client is created
only when the ref is unknown (`reused: false`, status `201`). `displayName` is kept in sync on reuse.

**Send `returnUrl`** — where to drop the client once they finish authorising. Without it they land on
AdFlow's "Connected!" page and have to close the tab themselves, which breaks the illusion for
white-label products. With it, they see the confirmation and are sent straight back to your app.

- `https://` only; other schemes are ignored.
- Any host is accepted — including your customers' own white-label domains.
- The redirect carries no secrets, only `?success=true` or `?error=…`, so treat it as a UI hint and
  confirm the actual result through `GET /clients`.

**Send `platforms`** — the subset your product actually uses: any of `"ads"`, `"facebook"`
(Pages & Instagram), `"threads"`. The connect page then offers only those. A Threads-only
scheduler showing "Connect Facebook Ads" confuses the customer and advertises capabilities you
do not ship.

- Omit it (or send an empty list) and all configured platforms are offered — the previous
  behaviour, unchanged.
- It is per-link, not per-account: send `["threads"]` from your Connect-Threads button and
  `["ads"]` from your Connect-Ads button, from the same key.

### `GET /clients`
List your clients + their imported resources.
```json
{ "ok": true, "data": [ { "id": "clt_…", "displayName": "Kedai ABC", "status": "active",
  "resources": [ { "id": "res_…", "platform": "ads", "metaId": "act_123", "name": "Main", "apiEnabled": true } ] } ] }
```

### `GET /clients/{id}` · `DELETE /clients/{id}`
Fetch one client (+ resources) / remove a client and its resources.

---

## Platforms — per-platform references

Every endpoint, request body, response shape and platform-specific limit lives in its own document.
They are the source of truth; this page carries only what is shared across all of them.

| Platform | Reference | Billing | Path scope |
| -------- | --------- | ------- | ---------- |
| Meta Ads | [api/MARKETING.md](./api/MARKETING.md) | $3/mo per enabled ad account | `/ads/act_123/…` |
| Threads | [api/THREADS.md](./api/THREADS.md) | $3/mo per enabled profile | `/threads/178…/…` |
| Facebook Pages | [api/PAGES.md](./api/PAGES.md) | Free with ≥1 paid platform | `/pages/123/…` |
| Instagram | [api/INSTAGRAM.md](./api/INSTAGRAM.md) | Free with ≥1 paid platform | `/instagram/178…/…` |
| TikTok | — | — | not yet exposed; on the roadmap |

Threads, Pages and Instagram share a single slot pool — one slot holds any one of them, and is
reusable across them once freed. Ad accounts have their own pool.

**Do not infer one platform's behaviour from another's.** Response shapes differ in ways that look
like typos but are not: endpoints that proxy a Meta object keep Meta's `snake_case` field names,
while endpoints where AdFlow computes the numbers use `camelCase`. Field names, defaults and limits
are documented per platform because they genuinely differ per platform.

---

## Webhooks (Meta → AdFlow → your system)

Register callback URL(s) in **Developer → API Access → Webhooks**. AdFlow relays events for resources
you manage, signed with your endpoint secret.

Headers on each delivery:
| Header | Meaning |
| ------ | ------- |
| `X-AdFlow-Signature` | `sha256=<hmac>` of the raw body, keyed by your endpoint secret — verify it |
| `X-AdFlow-Event` | field/topic (e.g. `feed`, `comments`, `messages`) |
| `X-AdFlow-Platform` | `ads` / `threads` / `pages` / `instagram` |
| `X-AdFlow-Object` | the Meta object id |
| `X-AdFlow-Delivery` | delivery id — **same value on every retry**, use it to deduplicate |

Body is the standard Meta shape `{ object, entry: [ … ] }` — **exactly one `entry` per delivery**, so
you never have to loop over unrelated accounts.

**Delivery semantics**
- **Success** = any `2xx`. Anything else, plus a network error, counts as a failure.
- **Timeout** = 10 seconds, then the attempt is failed and retried.
- **Retries** = 5 attempts total at 1m, 5m, 15m, 1h, 3h.
- **`X-AdFlow-Delivery` is stable across retries** — it is the delivery row id, not a per-attempt id.
  Use it as your idempotency key: a repeat of the same value is the same event, not a new one.
- Meta itself can deliver the same event more than once; dedupe on the message/comment id in the
  body as a second line of defence.

### Payload examples

The body is Meta's own shape, forwarded untouched. These are the four you get for an inbox product.

**Incoming Messenger message** — `X-AdFlow-Event: messaging`, `X-AdFlow-Platform: pages`
```json
{
  "object": "page",
  "entry": [{
    "id": "102938475610293",
    "time": 1755600000000,
    "messaging": [{
      "sender":    { "id": "7234567890123456" },
      "recipient": { "id": "102938475610293" },
      "timestamp": 1755599999999,
      "message": { "mid": "m_AbCdEf…", "text": "Is the clinic open today?" }
    }]
  }]
}
```

**Incoming Instagram DM** — `X-AdFlow-Event: messaging`, `X-AdFlow-Platform: instagram`
```json
{
  "object": "instagram",
  "entry": [{
    "id": "17841400000000000",
    "time": 1755600000000,
    "messaging": [{
      "sender":    { "id": "6789012345678901" },
      "recipient": { "id": "17841400000000000" },
      "timestamp": 1755599999999,
      "message": { "mid": "aWdfZG1fZX…", "text": "hi, price?" }
    }]
  }]
}
```

**New comment on a Page post** — `X-AdFlow-Event: feed`, `X-AdFlow-Platform: pages`
```json
{
  "object": "page",
  "entry": [{
    "id": "102938475610293",
    "time": 1755600000000,
    "changes": [{
      "field": "feed",
      "value": {
        "item": "comment", "verb": "add",
        "comment_id": "102938475610293_98765",
        "post_id":    "102938475610293_12345",
        "parent_id":  "102938475610293_12345",
        "created_time": 1755599999,
        "from": { "id": "7234567890123456", "name": "Aisyah" },
        "message": "How much?"
      }
    }]
  }]
}
```

**New comment on Instagram media** — `X-AdFlow-Event: comments`, `X-AdFlow-Platform: instagram`
```json
{
  "object": "instagram",
  "entry": [{
    "id": "17841400000000000",
    "time": 1755600000000,
    "changes": [{
      "field": "comments",
      "value": {
        "id": "17865799348089039",
        "text": "how much?",
        "media": { "id": "17895695668004550", "media_product_type": "FEED" },
        "from": { "id": "6789012345678901", "username": "aisyah" }
      }
    }]
  }]
}
```

### Reading the identifiers

| You need | Messenger | Instagram DM | Comments |
| --- | --- | --- | --- |
| Customer id | `messaging[].sender.id` (PSID) | `messaging[].sender.id` (IGSID) | `value.from.id` |
| Business account id | `entry.id` = Page id (also `X-AdFlow-Object`) | `entry.id` = IG user id | `entry.id` |
| Message / comment id | `message.mid` | `message.mid` | `value.comment_id` (FB) · `value.id` (IG) |
| Timestamp | `messaging[].timestamp` (ms) | `messaging[].timestamp` (ms) | `value.created_time` (s, FB only) |
| Display name | **not included** | **not included** | `value.from.name` (FB) · `value.from.username` (IG) |

Two things that trip people up:

1. **Messaging events carry no display name.** Resolve it once and cache it:
   `GET /v1/pages/contacts/{psid}?pageId=…` · `GET /v1/instagram/contacts/{igsid}?igId=…`
2. **Messaging events carry no conversation id.** There is no `t_…` in the payload — Meta does not
   send one. Reply using the sender id instead: `POST /v1/pages/{pageId}/messages` or
   `POST /v1/instagram/{igId}/messages` with `recipientId`. The `/conversations/{id}/messages`
   endpoints are for browsing an inbox you listed yourself, not for answering a webhook.

### Objects we never touch

The body is Meta's, forwarded byte-for-byte, so anything Meta puts inside `entry` arrives intact:

| Object | Where it appears | What it carries |
| --- | --- | --- |
| `referral` | `messaging[].referral`, or `messaging[].postback.referral` | `ad_id`, `ref`, `source`, `type` — the Click-to-Message ad the conversation started from |
| `message.reply_to` | `messaging[].message.reply_to.mid` | the message id being replied to (Messenger and Instagram) |
| story reply | `messaging[].message.reply_to.story` | `{ url, id }` of the story the customer replied to (Instagram) |
| story mention | `messaging[].message.attachments[].type = "story_mention"` | the mention, with the asset URL in `payload.url` (Instagram) |

Two things decide whether they arrive at all, and both are handled at onboarding:
Pages subscribe to `feed, messages, messaging_postbacks, mention, leadgen, messaging_referrals`, and
Instagram accounts to `messages, comments, mentions, message_reactions`. `messaging_referrals` is what
carries the ad referral on an existing thread; on a brand-new thread the referral rides inside the
first `messages` event. Check a Page's live subscription with `GET /v1/pages/{pageId}/subscriptions`.

### `X-AdFlow-Event` values

| Platform | Values |
| --- | --- |
| `pages` | `messaging` (Messenger send/receive events), `feed` (posts, comments, reactions), `mention`, `messaging_postbacks`, `messaging_referrals`, `leadgen` |
| `instagram` | `messaging`, `comments`, `mentions`, `message_reactions` |
| `threads` | `mentions`, `replies` |
| `ads` | Meta's ad-account change fields |

Anything Meta sends under `changes[].field` is passed through verbatim, so treat this list as the
common set rather than a closed enum.

Respond `2xx` to ack; non-2xx/timeout is retried (1m, 5m, 15m, 1h, 3h; 5 attempts).

**Verify the signature (Node)**
```js
const crypto = require('crypto');
function verify(rawBody, header, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
```
