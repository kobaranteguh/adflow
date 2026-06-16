# AdFlow Marketing API

Full **Meta Marketing API parity** for partners and client-facing apps. AdFlow holds the Meta
**Marketing API Full Access tier**, so you get the ecosystem Meta approved for us — campaigns,
ad sets, ads, creatives, media, audiences, targeting, insights, pixels, Conversions API, lead
ads — **without doing your own Meta App Review**.

AdFlow is the proxy: **Meta only sees AdFlow.** Your request → AdFlow → Meta → AdFlow → you. We
forward your call with the client's stored token and return Meta's raw response (Meta's own error
messages included). The client's Meta token is never exposed to you.

```
PARTNER ──(ak_live_ key)──► ADFLOW ──(client token, AdFlow app)──► META
   ▲                            │                                    │
   └──────── { ok, data } ◄─────┴──────────── raw Meta response ◄─────┘
```

## Status legend
Every endpoint is labelled so you never build against something that isn't live:

- **Available** — implemented and live in production.
- **Partial** — works, but via generic passthrough or with limits (noted inline).
- **Planned** — on the roadmap, not yet callable. Do not integrate yet.
- **Deprecated** — being removed; avoid.

> Honesty note: this document distinguishes shipped vs roadmap. "Planned" endpoints return `404`
> today.

---

## 1. Overview
- **Base URL:** `https://adflowapps.com/api/v1`
- **Model:** reseller proxy. You onboard clients; AdFlow stores each client's Meta token under your
  partner account and gates every call on an active billing slot.
- **Surface:** one REST API for Ads (this doc), plus Threads, Pages, Instagram (separate docs).
- **No SDK required** — call REST directly from any language.

## 2. Auth
- Every request: `Authorization: Bearer ak_live_…` (create keys in Developer → API Access).
- Keys are stored as a **SHA-256 hash + visible prefix**; the secret is shown once on creation.
- Missing/invalid key → `401 unauthorized`. Key without the `ads` scope → `403 forbidden`.

```bash
curl https://adflowapps.com/api/v1/ads/accounts -H "Authorization: Bearer ak_live_..."
```

## 3. Rate limit  · *Available*
- **120 requests / minute per key.** Exceeding → `429 rate_limited`.
- Upstream Meta rate limits are absorbed by AdFlow's Full Access tier (9,000 points).

## 4. Billing  · *Available*
- **$2 / active ad account / month** (+ processing fee). Threads **$1 / profile**. **Pages &
  Instagram free.** No refund for partial months.
- A call to a resource that isn't in an active slot → `403 api_not_enabled` (enable it to buy a
  slot) or `402 slot_required` / `402 billing_not_configured`.
- Usage: `GET /v1/usage` returns slots, active ad-account ids, fee %, estimated monthly, calls.

## 5. Client onboarding  · *Available*
You manage the Meta accounts of your end-clients. Onboard a client once; their assets appear under you.

| Method | Path | Status | Purpose |
|---|---|---|---|
| POST | `/clients` | Available | Create a client → returns `onboardUrl` to share |
| GET | `/clients` | Available | List clients + their resources |
| GET | `/clients/{id}` | Available | Client detail |
| DELETE | `/clients/{id}` | Available | Remove a client (revokes access) |

```bash
curl -X POST https://adflowapps.com/api/v1/clients \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "displayName": "Kedai ABC" }'
# → { "ok": true, "data": { "id": "...", "onboardUrl": "https://adflowapps.com/connect/..." } }
```

## 6. Meta connection flow  · *Available*
The client opens `onboardUrl` (no AdFlow login needed) and authorises via **Facebook Login for
Business** (Meta's equivalent of embedded signup for ads). On consent, AdFlow imports their ad
accounts, Pages and Instagram accounts and stores the token under your partner account. Threads has
its own connect flow. Wrong/expired onboarding state is rejected.

> You then **enable** the specific ad accounts you'll bill for. Disabled resources return
> `api_not_enabled` until enabled.

## 7. Ad accounts  · *Available*
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/accounts` | Available | Ad accounts you can operate on (your onboarded clients) |
| GET | `/ads/accounts/{id}` | Available | Account detail (`?fields=` override) |
| GET | `/ads/{accountId}/funding` | Available | Funding source, balance, spend cap |
| POST | `/ads/{accountId}/spend-cap` | Available | Set/clear lifetime spend cap `{ spend_cap }` |

`account_status` + `disable_reason` (in account detail) surface **ad-account restriction status**.

## 8. Business assets  · *Planned*
Business Manager, system users, asset permissions and business-verification status are **not yet
exposed** as partner endpoints (enterprise roadmap; `business_management` held).

| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/business` | Planned | List businesses |
| GET | `/business/{id}/assets` | Planned | Assets + permissions |
| GET | `/business/system-users` | Planned | System user / token flow |

## 9. Pages  · *Planned* (selection) / *Available* (via Pages API)
Selecting a Page for an ad creative needs the Page id. Listing the client's Pages via the **Ads**
surface is **Planned** (the logic exists internally; the partner endpoint is being exposed). Full
Page management lives in the separate **Pages API** doc.

| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/pages` | Planned | List Pages usable for ad creatives |

Until live, pass a known `page_id` directly in a creative's `object_story_spec`.

## 10. Instagram accounts  · *Planned* (selection) / *Available* (via Instagram API)
Same as Pages: listing IG business accounts for ad placement via the Ads surface is **Planned**
(internal logic exists). Pass a known `instagram_actor_id` in the creative meanwhile.

| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/instagram-accounts` | Planned | List IG business accounts for ads |

## 11. Campaigns  · *Available*
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/campaigns` | Available | List campaigns (`?date_preset=`, `?status=`) |
| POST | `/ads/{accountId}/campaigns` | Available | Create `{ name, objective, status? }` |
| POST·PATCH | `/ads/campaigns/{id}?accountId=` | Available | Update — **any** Meta campaign field |
| DELETE | `/ads/campaigns/{id}?accountId=` | Available | Delete campaign |

## 12. Ad sets  · *Available*
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/adsets?campaignId=` | Available | List ad sets (with insights) |
| POST | `/ads/{accountId}/adsets` | Available | Create ad set |
| POST·PATCH | `/ads/adsets/{id}?accountId=` | Available | Update — targeting/budget/schedule/bid/placement/… |
| DELETE | `/ads/adsets/{id}?accountId=` | Available | Delete ad set |

**Placement** & **advanced targeting** are set via the ad set's `targeting` field (passthrough),
e.g. `targeting.publisher_platforms`, `facebook_positions`, `instagram_positions`, flexible specs.

## 13. Ads  · *Available*
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/ads?adSetId=` | Available | List ads (with insights) |
| POST | `/ads/{accountId}/ads` | Available | Create ad (references a creative) |
| POST·PATCH | `/ads/ads/{id}?accountId=` | Available | Update — any Meta ad field |
| DELETE | `/ads/ads/{id}?accountId=` | Available | Delete ad |

**Ad rejection / status reason:** read `effective_status` + `issues_info` via
`GET /ads/{accountId}/ads?fields=id,name,effective_status,issues_info`.

## 14. Creatives  · *Available* (core) / *Partial* (typed formats)
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/creatives` | Available | List ad creatives |
| POST | `/ads/{accountId}/creatives` | Available | Create creative (`object_story_spec`, etc.) |
| GET | `/ads/creatives/{id}/preview?accountId=&ad_format=` | Available | Rendered ad preview (iframe) |

Carousel, collection and dynamic creatives are **Partial** — fully supported via the raw
`object_story_spec` / `child_attachments` / `asset_feed_spec` you POST to `/creatives`, but AdFlow
has no typed builder for them yet. Collection/DPA also need Catalog (§19, Planned).

## 15. Image / video upload  · *Available*
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET/POST | `/ads/{accountId}/images` | Available | List / upload image → `hash` (multipart file, or JSON `bytes`/`url`) |
| GET/POST | `/ads/{accountId}/videos` | Available | List / upload video → `id` (multipart `source`, or JSON `file_url`) |

```bash
curl -X POST "https://adflowapps.com/api/v1/ads/act_123/images" \
  -H "Authorization: Bearer ak_live_..." -F "file=@banner.jpg"
```

## 16. Lead Ads  · *Available* (read) / *Planned* (create/test)
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/pages/{pageId}/lead-forms?accountId=` | Available | List lead-gen forms on a Page |
| GET | `/ads/lead-forms/{id}/leads?accountId=` | Available | Retrieve leads (`?since=&until=`) |
| GET | `/ads/lead-forms/{id}?accountId=` | Planned | Read full form field schema |
| POST | `/ads/pages/{pageId}/lead-forms?accountId=` | Planned | Create a lead form |
| — | test lead / CRM mapping / dedup | Planned | (dedup is your side, via lead `id`) |

Real-time leads: see **Webhooks** (§21) — `leadgen` events relay to your webhook. Requires
`leads_retrieval` and the client's Page onboarded.

## 17. Audiences & targeting  · *Available*
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET/POST | `/ads/{accountId}/audiences` | Available | List / create (`type`: custom·engagement·website·lookalike) |
| GET/DELETE | `/ads/audiences/{id}?accountId=` | Available | Detail / delete |
| POST/DELETE | `/ads/audiences/{id}/users?accountId=` | Available | Add / remove members (`hash:true` → AdFlow SHA-256 for you) |
| GET | `/ads/{accountId}/reach-estimate?targeting_spec=` | Available | Audience-size estimate |
| GET | `/ads/targeting/search?accountId=&type=&q=` | Available | Search targeting taxonomy (interests/geo/…) |
| POST | `/ads/targeting/validate?accountId=` | Available | Validate/preview a targeting spec |
| — | audience sharing across businesses | Planned | needs `business_management` |

Customer-file PII is **SHA-256 hashed** (by you, or by AdFlow with `hash:true`) before reaching Meta.

## 18. Pixel / Dataset / Conversions API  · *Available* (core) / *Planned* (diagnostics)
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET/POST | `/ads/{accountId}/pixels` | Available | List / create pixel |
| GET | `/ads/pixels/{id}/stats?accountId=` | Available | Pixel event stats |
| GET | `/ads/pixels/{id}/health?accountId=` | Available | Pixel freshness/availability |
| POST | `/ads/pixels/{id}/events?accountId=` | Available | **CAPI** server events `{ data, test_event_code? }` |
| GET/POST | `/ads/{accountId}/custom-conversions` | Available | List / create custom conversion |
| GET/POST | `/ads/{accountId}/offline-sets` | Available | List / create offline conversion data set |
| POST | `/ads/offline-sets/{id}/events?accountId=` | Available | Upload offline events `{ data, upload_tag? }` |
| GET | `/ads/pixels/{id}/diagnostics?accountId=` | Planned | Event match quality / diagnostics |

- CAPI is enabled by `ads_read` (Server-Side API). Use `test_event_code` to validate in Events Manager.
- **Event deduplication** is your responsibility: send a stable `event_id` on both pixel and CAPI events.

```bash
curl -X POST "https://adflowapps.com/api/v1/ads/pixels/100200300/events?accountId=act_123" \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "data": [ { "event_name": "Purchase", "event_time": 1718500000, "event_id": "ord_9912",
        "action_source": "website", "user_data": { "em": ["<sha256>"] },
        "custom_data": { "currency": "MYR", "value": 129.90 } } ] }'
```

## 19. Catalog / Product Ads  · *Planned*
Not yet available — `catalog_management` is pending Meta App Review. After approval we'll expose:

| Method | Path | Status | Purpose |
|---|---|---|---|
| GET/POST | `/ads/catalogs` | Planned | List / create product catalog |
| GET/POST | `/ads/catalogs/{id}/products` | Planned | Products |
| GET/POST | `/ads/catalogs/{id}/product-sets` | Planned | Product sets |
| POST | `/ads/catalogs/{id}/feed` | Planned | Feed upload |
| GET | `/ads/catalogs/{id}/diagnostics` | Planned | Product diagnostics |

Dynamic product ads (DPA) and catalog-sales campaigns depend on this.

## 20. Insights / Reporting  · *Available* (core) / *Partial* (paging) / *Planned* (export/scheduled)
| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/ads/{accountId}/insights` | Available | Account insights; presets or raw passthrough |
| GET | `…/insights?level=campaign\|adset\|ad` | Available | Per-level insights |
| GET | `…/insights?breakdown=…` / `?breakdowns=…` | Available | Breakdowns (age/gender/platform/placement/device/country/…) |
| GET | `…/insights?date_preset=` / `?since=&until=` | Available | Date preset or custom range |
| POST | `/ads/{accountId}/reports` | Available | Start async report → `report_run_id` |
| GET | `/ads/reports/{id}?accountId=` | Available | Poll async report → `{ status, percent, results? }` |
| — | cursor pagination on lists | Partial | AdFlow auto-follows paging (≤ ~10 pages); explicit `after` cursor is Planned |
| — | CSV export / scheduled reports | Planned | JSON only today |

```bash
curl "https://adflowapps.com/api/v1/ads/act_123/insights?level=ad&breakdowns=publisher_platform&since=2026-06-01&until=2026-06-15&fields=ad_id,spend,actions" \
  -H "Authorization: Bearer ak_live_..."
```

## 21. Webhooks  · *Available* (infra) / *Partial* (leadgen docs)
AdFlow receives Meta events, verifies them, and relays to your registered URL.

| Capability | Status | Notes |
|---|---|---|
| Meta verify endpoint (handshake) | Available | `GET /api/v1/webhooks/meta` echoes `hub.challenge` |
| Inbound signature validation | Available | `X-Hub-Signature-256` verified against app secret |
| Leadgen event relay | Partial | `leadgen` field subscribed on Page connect; relayed by object id (onboard the client's Page) |
| Page comment / message events | Available | relayed; see **Pages API** doc |
| Instagram comment events | Partial | see **Instagram API** doc |
| Delivery retry + event log | Available | failed deliveries retried by cron; logged |

## 22. Partner webhook forwarding  · *Available*
Register a callback in **Developer → API Access → Webhooks**. AdFlow forwards relevant events to it.

- **Signature:** each delivery is signed `X-AdFlow-Signature` (HMAC-SHA256 of the body with your
  webhook secret) — verify it before trusting the payload.
- **Payload:** the standard Meta shape (`{ object, entry: [ … ] }`) so you parse it like Meta.
- **Retry:** non-2xx responses are retried with backoff; deliveries are logged.

## 23. Pagination  · *Partial*
- List endpoints currently return the **concatenated** result set (AdFlow follows Meta's
  `paging.next` internally, up to a safety cap of ~10 pages / ~1,000 items).
- **Planned:** opt-in cursor passthrough (`?after=` + `paging` in the response) for very large sets.
- Async reports (§20) are the recommended path for large pulls.

## 24. Error codes  · *Available*
Envelope: `{ "ok": false, "error": { "code": "...", "message": "..." } }`. `message` is Meta's own
text on upstream failures.

| Code | HTTP | Meaning |
|---|---|---|
| `unauthorized` | 401 | Missing/invalid Bearer key |
| `forbidden` | 403 | Key lacks the required scope |
| `not_found` | 404 | Resource not among your onboarded clients (or endpoint is Planned) |
| `api_not_enabled` | 403 | Resource not in an active billing slot |
| `slot_required` | 402 | A paid slot must be purchased first |
| `billing_not_configured` | 402 | No payment method on file |
| `bad_request` | 400 | Missing/invalid params (Meta validation message passed through) |
| `rate_limited` | 429 | > 120 req/min — slow down |
| `upstream_error` | 502 | Meta rejected the request (message included) |
| `internal_error` | 500 | Unexpected server error |

## 25. Permission mapping
Which Meta permission backs each area (all held by AdFlow unless noted):

| Area | Meta permission | Status |
|---|---|---|
| Read insights, accounts, CAPI server events | `ads_read` | Held |
| Create/manage campaigns, ad sets, ads, creatives, audiences, pixels | `ads_management` | Held |
| List Pages, page-backed creatives | `pages_show_list`, `pages_read_engagement` | Held |
| Instagram-positioned ads | `instagram_basic` | Held |
| Lead ads retrieval | `leads_retrieval` | Held |
| Business/asset/system-user management (§8) | `business_management` | Held — endpoints Planned |
| Catalog / product ads (§19) | `catalog_management` | **Pending review** — endpoints Planned |

Marketing API Access Tier: **Full access** (unlimited ad accounts, high rate limits, Business
Manager API).

## 26. Changelog / versioning
- **API version:** `v1` (path-based: `/api/v1`). Breaking changes ship under a new version path;
  additive changes (new fields/endpoints) ship in place.
- **Graph version:** AdFlow calls Meta Graph `v21.0` for the ads surface.

| Date | Change |
|---|---|
| 2026-06-17 | **Full Access parity release.** Added account detail/funding/spend-cap; full update + delete for campaign/ad set/ad; creatives + image/video upload + preview; audiences (lookalike/website/engagement/custom + hashed member upload + delete); reach-estimate + targeting search/validate; raw + async insights; pixel create/health + **Conversions API** + custom & offline conversions; lead form + lead retrieval; `leadgen` webhook. |
| (earlier) | Initial release: campaigns, ad sets, ads, audiences, pixels, account insights. |

**Roadmap (Planned):** Page/IG selection endpoints, lead form create + test, pixel diagnostics,
cursor pagination, report export/scheduling, Catalog/product ads (after `catalog_management`
approval), Business/asset/system-user management.
