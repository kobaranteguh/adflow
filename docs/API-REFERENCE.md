# AdFlow Bridge API — Reference

Complete reference for the AdFlow partner REST API (`/api/v1`). AdFlow is a **bridge**: your system
calls AdFlow with an API key; AdFlow uses its own Meta-App-Review-approved access (verified **Tech
Provider**) to call the Meta Graph API on behalf of your onboarded clients and returns the result.

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth header:** `Authorization: Bearer ak_live_…`
- **Content type:** `application/json`

> SDKs (recommended): `@adflow/sdk` (Node) · `adflow/sdk` (PHP) · `adflow-sdk` (Python) — see
> [PARTNER-GUIDE.md](./PARTNER-GUIDE.md). This doc is the raw HTTP contract behind them.

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

Body: `{ "displayName": "Kedai ABC", "externalRef": "optional-your-id" }`
```json
{ "ok": true, "data": { "id": "clt_…", "displayName": "Kedai ABC", "onboardUrl": "https://adflowapps.com/connect/obs_…" } }
```

### `GET /clients`
List your clients + their imported resources.
```json
{ "ok": true, "data": [ { "id": "clt_…", "displayName": "Kedai ABC", "status": "active",
  "resources": [ { "id": "res_…", "platform": "ads", "metaId": "act_123", "name": "Main", "apiEnabled": true } ] } ] }
```

### `GET /clients/{id}` · `DELETE /clients/{id}`
Fetch one client (+ resources) / remove a client and its resources.

---

## Ads (Meta Marketing API)

Paid: each enabled ad account = 1 slot ($2/mo). Scope: `account('act_123')` in SDKs.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/ads/accounts` | List your API-enabled ad accounts |
| GET | `/ads/{accountId}/campaigns?date_preset=last_30d&status=ACTIVE` | Campaigns + insights |
| POST | `/ads/{accountId}/campaigns` | Create campaign |
| POST | `/ads/campaigns/{id}?accountId=…` | Update campaign status |
| DELETE | `/ads/campaigns/{id}?accountId=…` | Delete campaign |
| GET | `/ads/{accountId}/adsets?campaignId=…` | Ad sets for a campaign |
| POST | `/ads/{accountId}/adsets` | Create ad set (AdSetConfig) |
| POST | `/ads/adsets/{id}?accountId=…` | Update ad set status / dailyBudget |
| GET | `/ads/{accountId}/ads?adSetId=…` | Ads (by ad set, or account-wide) |
| POST | `/ads/{accountId}/ads` | Create ad (AdCreativeConfig + adName, adSetId, format) |
| POST | `/ads/ads/{id}?accountId=…` | Update ad status |
| GET | `/ads/{accountId}/insights?breakdown=platform|age_gender|country|placement|device&time_increment=1` | Insights + breakdowns |
| GET | `/ads/{accountId}/audiences` | List custom audiences |
| POST | `/ads/{accountId}/audiences` | Create audience (`type`: engagement/website/lookalike) |
| GET | `/ads/{accountId}/pixels` | List pixels |
| GET | `/ads/pixels/{id}/stats?accountId=…` | Pixel event stats |

**Create campaign — example**
```bash
curl -X POST https://adflowapps.com/api/v1/ads/act_123/campaigns \
  -H "Authorization: Bearer ak_live_…" -H "Content-Type: application/json" \
  -d '{"name":"Q3 Launch","objective":"OUTCOME_TRAFFIC","status":"PAUSED"}'
# → { "ok": true, "data": { "id": "238…" } }
```

**Create audience — body shapes**
- engagement: `{ "type":"engagement", "name":"…", "pageId":"…", "engagementType":"…", "retentionDays":365 }`
- website: `{ "type":"website", "name":"…", "pixelId":"…", "retentionDays":30 }`
- lookalike: `{ "type":"lookalike", "name":"…", "sourceAudienceId":"…", "country":"MY", "ratio":0.01 }`

---

## Threads

Paid: each enabled Threads profile = 1 slot ($1/mo). Scope: `profile('178…')` in SDKs.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/threads/{profileId}` | Profile info |
| GET | `/threads/{profileId}/posts?limit=25` | Recent posts |
| POST | `/threads/{profileId}/posts` | Publish |
| GET | `/threads/{profileId}/insights` | Account insights |
| GET | `/threads/posts/{id}/insights?profileId=…` | Post insights |

**Publish — body**
```json
{ "mediaType": "TEXT|IMAGE|VIDEO|CAROUSEL|POLL", "text": "…",
  "mediaUrls": [{ "url": "https://…", "type": "image" }],
  "pollOptions": ["A","B"], "pollDuration": 24, "replyToId": "…" }
```
```bash
curl -X POST https://adflowapps.com/api/v1/threads/17841400000000000/posts \
  -H "Authorization: Bearer ak_live_…" -H "Content-Type: application/json" \
  -d '{"mediaType":"TEXT","text":"Hello from AdFlow"}'
```
> Meta limits: cannot delete published posts; 250 posts / 1,000 replies per 24h per profile.

---

## Facebook Pages (free)

Free for any partner with ≥1 paid platform. Scope: `page('123')` in SDKs.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/pages/{pageId}/posts?limit=25` | List posts |
| POST | `/pages/{pageId}/posts` | Create post `{ message, link?, scheduledPublishTime? }` |
| DELETE | `/pages/posts/{id}?pageId=…` | Delete a post the app published |
| GET | `/pages/posts/{id}/comments?pageId=…` | List comments |
| GET | `/pages/posts/{id}/insights?pageId=…` | Post insights |
| POST | `/pages/comments/{id}?pageId=…` | Reply to comment `{ message }` |
| DELETE | `/pages/comments/{id}?pageId=…` | Delete comment |
| GET | `/pages/{pageId}/insights?period=day|week|days_28` | Page insights |
| GET | `/pages/{pageId}/conversations?limit=25` | Messenger conversations |
| GET | `/pages/conversations/{id}/messages?pageId=…` | Conversation messages |
| POST | `/pages/conversations/{id}/messages?pageId=…` | Send message (24h window) |

> Meta limits: an app can only edit/delete posts it published; Messenger send must be within the
> 24-hour standard messaging window.

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
| `X-AdFlow-Delivery` | unique delivery id |

Body is the standard Meta shape `{ object, entry: [ … ] }`. Respond `2xx` to ack; non-2xx/timeout is
retried (1m, 5m, 15m, 1h, 3h; 5 attempts).

**Verify the signature (Node)**
```js
const crypto = require('crypto');
function verify(rawBody, header, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
```

---

## Instagram

Free for any partner with ≥1 paid platform. IG accounts import automatically when a client connects a
Facebook Page with a linked IG Business account. Scope: `instagram('178…')` in SDKs.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/instagram/{igId}/media?limit=25` | List media |
| POST | `/instagram/{igId}/media` | Publish `{ mediaType:"IMAGE"|"VIDEO"|"REELS"|"STORIES", imageUrl?, videoUrl?, caption? }` (2-step container→publish, handled server-side) |
| GET | `/instagram/{igId}/insights?since=&until=` | Account insights |
| GET | `/instagram/media/{id}/insights?igId=&mediaType=` | Media insights |
| GET | `/instagram/media/{id}/comments?igId=` | List comments |
| POST | `/instagram/media/{id}/comments?igId=` | Comment `{ message }` |
| POST | `/instagram/comments/{id}?igId=` | Reply `{ message }` or hide `{ hidden: true/false }` |
| DELETE | `/instagram/comments/{id}?igId=` | Delete comment |
| GET | `/instagram/{igId}/conversations?limit=20` | DM conversations |
| GET | `/instagram/conversations/{id}/messages?igId=` | Messages |
| POST | `/instagram/conversations/{id}/messages?igId=` | Send DM `{ recipientId, message }` (24h window) |

> Meta limits: cannot delete published media or edit captions; DM sending only within the human-agent
> window. Some `instagram_business_*` permissions are pending App Review — partner access opens once
> Advanced Access is granted.

## TikTok

Not yet exposed — on the roadmap.
