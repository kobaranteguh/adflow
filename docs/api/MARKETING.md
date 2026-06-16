# AdFlow Marketing API (Meta Ads)

Full **Meta Marketing API parity**. AdFlow holds the **Full Access tier**, so as a partner you
get everything Meta grants us — campaigns, ad sets, ads, creatives, media, audiences, targeting,
insights, pixels, Conversions API, lead ads, and more — without doing your own Meta App Review.
AdFlow is the proxy: Meta only sees AdFlow's domain; we forward your call with the client's token
and return Meta's raw response (Meta's own error messages included).

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** every request needs `Authorization: Bearer ak_live_…` (your AdFlow API key)
- **`{accountId}`** = a client's ad-account id (e.g. `act_1234567890`) you onboarded and enabled.
- **Billing:** $2 / active ad account / month (+ processing fee). Pages & Instagram free.

> Onboard a client first: `POST /v1/clients` returns a connect link; once they authorise, their ad
> accounts appear and you enable them. See PARTNER-GUIDE.

## Conventions
- Routes that don't carry `{accountId}` in the path take **`?accountId=act_…`** to pick which client
  token to use (it identifies the owning, enabled account).
- **Updates** accept any Meta field for that object and forward it as-is (true parity). Convenience
  aliases: `dailyBudget`→`daily_budget`, `lifetimeBudget`→`lifetime_budget` (minor units).
- **Raw insights:** supplying any of `level`, `fields`, `since`, `until`, `breakdowns`,
  `action_breakdowns`, `filtering` switches `/insights` to raw Meta passthrough (paginated).

## Endpoints

### Ad accounts
| Method | Path | Purpose |
|---|---|---|
| GET | `/ads/accounts` | List ad accounts you can operate on |
| GET | `/ads/accounts/{id}` | Account detail (`?fields=` override) |
| GET | `/ads/{accountId}/funding` | Funding source + balance + spend cap |
| POST | `/ads/{accountId}/spend-cap` | Set/clear lifetime spend cap `{ spend_cap }` |

### Campaigns / ad sets / ads
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/ads/{accountId}/campaigns` | List / create campaign |
| POST·PATCH/DELETE | `/ads/campaigns/{id}?accountId=` | Update (any field) / delete campaign |
| GET/POST | `/ads/{accountId}/adsets` | List (`?campaignId=`) / create ad set |
| POST·PATCH/DELETE | `/ads/adsets/{id}?accountId=` | Update (targeting/budget/schedule/…) / delete |
| GET/POST | `/ads/{accountId}/ads` | List (`?adSetId=`) / create ad |
| POST·PATCH/DELETE | `/ads/ads/{id}?accountId=` | Update / delete ad |

### Creatives & media
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/ads/{accountId}/creatives` | List / create ad creative |
| GET/POST | `/ads/{accountId}/images` | List / upload image (multipart file, or JSON `bytes`/`url`) → `hash` |
| GET/POST | `/ads/{accountId}/videos` | List / upload video (multipart `source`, or JSON `file_url`) → `id` |
| GET | `/ads/creatives/{id}/preview?accountId=&ad_format=` | Rendered ad preview (iframe) |

### Audiences & targeting
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/ads/{accountId}/audiences` | List / create (`type`: custom·engagement·website·lookalike) |
| GET/DELETE | `/ads/audiences/{id}?accountId=` | Detail / delete |
| POST/DELETE | `/ads/audiences/{id}/users?accountId=` | Add / remove members (`hash:true` to SHA-256 for you) |
| GET | `/ads/{accountId}/reach-estimate?targeting_spec=` | Audience-size estimate |
| GET | `/ads/targeting/search?accountId=&type=&q=` | Search targeting taxonomy (interests/geo/…) |
| POST | `/ads/targeting/validate?accountId=` | Validate/preview a targeting spec `{ targeting }` |

### Insights & reporting
| Method | Path | Purpose |
|---|---|---|
| GET | `/ads/{accountId}/insights` | Account insights; presets (`date_preset`, `breakdown`, `time_increment`) or raw passthrough |
| POST | `/ads/{accountId}/reports` | Start async report (returns `report_run_id`) |
| GET | `/ads/reports/{id}?accountId=` | Poll async report → `{ status, percent, results? }` |

### Pixels, Conversions API & conversions
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/ads/{accountId}/pixels` | List / create pixel |
| GET | `/ads/pixels/{id}/stats?accountId=` | Pixel event stats |
| GET | `/ads/pixels/{id}/health?accountId=` | Pixel freshness/availability |
| POST | `/ads/pixels/{id}/events?accountId=` | **Conversions API** server events `{ data, test_event_code? }` |
| GET/POST | `/ads/{accountId}/custom-conversions` | List / create custom conversion |
| GET/POST | `/ads/{accountId}/offline-sets` | List / create offline conversion data set |
| POST | `/ads/offline-sets/{id}/events?accountId=` | Upload offline events `{ data, upload_tag? }` |

### Lead ads
| Method | Path | Purpose |
|---|---|---|
| GET | `/ads/pages/{pageId}/lead-forms?accountId=` | List lead-gen forms on a Page |
| GET | `/ads/lead-forms/{id}/leads?accountId=` | Retrieve submitted leads (`?since=&until=`) |

> **Lead webhooks:** register a webhook (Developer → API Access → Webhooks) and onboard the client's
> Page. AdFlow relays `leadgen` events (signed `X-AdFlow-Signature`) the moment a lead is submitted.

## Examples

Create a paused campaign:
```bash
curl -X POST https://adflowapps.com/api/v1/ads/act_1234567890/campaigns \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "name": "Ramadan Sale", "objective": "OUTCOME_TRAFFIC", "status": "PAUSED" }'
```

Update an ad set's budget + targeting (any Meta field, forwarded as-is):
```bash
curl -X PATCH "https://adflowapps.com/api/v1/ads/adsets/239847?accountId=act_1234567890" \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "daily_budget": "5000", "targeting": { "geo_locations": { "countries": ["MY"] } } }'
```

Upload an image then read its hash:
```bash
curl -X POST "https://adflowapps.com/api/v1/ads/act_1234567890/images" \
  -H "Authorization: Bearer ak_live_..." -F "file=@banner.jpg"
```

Raw insights at ad level with a custom date range + breakdown:
```bash
curl "https://adflowapps.com/api/v1/ads/act_1234567890/insights?level=ad&breakdowns=publisher_platform&since=2026-06-01&until=2026-06-15&fields=ad_id,spend,actions" \
  -H "Authorization: Bearer ak_live_..."
```

Send a Conversions API purchase event:
```bash
curl -X POST "https://adflowapps.com/api/v1/ads/pixels/100200300/events?accountId=act_1234567890" \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "data": [ { "event_name": "Purchase", "event_time": 1718500000, "action_source": "website",
        "user_data": { "em": ["<sha256>"] }, "custom_data": { "currency": "MYR", "value": 129.90 } } ] }'
```

Add hashed customers to an audience (AdFlow hashes for you):
```bash
curl -X POST "https://adflowapps.com/api/v1/ads/audiences/600700800/users?accountId=act_1234567890" \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "schema": "EMAIL", "hash": true, "data": ["jane@example.com","ali@example.com"] }'
```

## Errors
JSON envelope: `{ "ok": false, "error": { "code": "...", "message": "..." } }`. `message` is Meta's
own error text on upstream failures, so you debug against the real API.
- `not_found` — ad account not among your onboarded clients
- `api_not_enabled` — ad account not in an active billing slot (enable it / it isn't paid)
- `bad_request` — missing/invalid params (Meta's validation message passed through)
- `upstream_error` — Meta rejected the request (message included)
- `rate_limited` — slow down (120 req/min per key)
