# AdFlow Marketing API (Meta Ads)

Manage your clients' Meta ad accounts — campaigns, ad sets, ads, audiences, pixels, and insights — through AdFlow. No Meta App Review needed on your side.

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** every request needs `Authorization: Bearer ak_live_…` (your AdFlow API key)
- **`{accountId}`** = a client's ad-account id (e.g. `act_1234567890`) that you onboarded and enabled for the API.
- **Billing:** $2 / active ad account / month (+ processing fee). Pages & Instagram free.

> Onboard a client first: `POST /v1/clients` returns a connect link; once they authorise, their ad accounts appear and you enable them. See PARTNER-GUIDE.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/ads/accounts` | List ad accounts you can operate on |
| GET | `/ads/{accountId}/campaigns` | List campaigns |
| POST | `/ads/{accountId}/campaigns` | Create a campaign |
| POST | `/ads/campaigns/{id}` | Update a campaign |
| DELETE | `/ads/campaigns/{id}` | Delete a campaign |
| GET | `/ads/{accountId}/adsets` | List ad sets |
| POST | `/ads/{accountId}/adsets` | Create an ad set |
| POST | `/ads/adsets/{id}` | Update an ad set |
| GET | `/ads/{accountId}/ads` | List ads |
| POST | `/ads/{accountId}/ads` | Create an ad |
| POST | `/ads/ads/{id}` | Update an ad |
| GET | `/ads/{accountId}/audiences` | List custom audiences |
| POST | `/ads/{accountId}/audiences` | Create a custom audience |
| GET | `/ads/{accountId}/pixels` | List pixels |
| GET | `/ads/pixels/{id}/stats` | Pixel event stats |
| GET | `/ads/{accountId}/insights` | Account-level insights (spend, impressions, CTR, …) |

## Examples

List ad accounts:
```bash
curl https://adflowapps.com/api/v1/ads/accounts \
  -H "Authorization: Bearer ak_live_..."
```

Create a paused campaign:
```bash
curl -X POST https://adflowapps.com/api/v1/ads/act_1234567890/campaigns \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "name": "Ramadan Sale", "objective": "OUTCOME_TRAFFIC", "status": "PAUSED" }'
```

Get insights:
```bash
curl "https://adflowapps.com/api/v1/ads/act_1234567890/insights?date_preset=last_7d" \
  -H "Authorization: Bearer ak_live_..."
```

## Errors
JSON envelope: `{ "error": { "code": "...", "message": "..." } }`.
- `not_found` — ad account not among your onboarded clients
- `api_not_enabled` — ad account not in an active billing slot (enable it / it isn't paid)
- `rate_limited` — slow down (120 req/min per key)
