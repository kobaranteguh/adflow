# AdFlow Partner API

Official REST API for **AdFlow** (`/api/v1`) — manage your clients' **Meta Marketing (Ads),
Threads, and free Facebook Pages & Instagram** through AdFlow. **No SDK to install** — call the
REST API directly with your `ak_live_…` key from any language.

AdFlow holds **Meta Marketing API Full Access**, so you get full parity (campaigns, ad sets, ads,
creatives, media, audiences, targeting, insights, pixels, Conversions API, lead ads, …) **without
doing your own Meta App Review**. AdFlow is the proxy: Meta only sees AdFlow's domain; we forward
your call with the client's token and return Meta's raw response.

You pay AdFlow only for the **ad-account / Threads slots you enable** (Pages & Instagram are free);
billing is auto-charged to the **partner's** Stripe card.

## 📚 Documentation

- **[docs/PARTNER-GUIDE.md](docs/PARTNER-GUIDE.md)** — start here: concepts, onboarding clients, billing, webhooks, FAQ
- **[docs/API-REFERENCE.md](docs/API-REFERENCE.md)** — combined endpoint reference, params, responses, curl examples
- **[docs/META-POLICY.md](docs/META-POLICY.md)** — Meta compliance, Tech Provider status, rate limits, limitations
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — what changed / was fixed, newest first

### Not a coder?
- **[docs/MARKETING-AI-PROMPT.md](docs/MARKETING-AI-PROMPT.md)** — copy-paste prompt for ChatGPT/Claude/Cursor; it knows the full Marketing API and only ever builds **through AdFlow** (never directly against Meta).

### Per-platform references
- **[docs/api/MARKETING.md](docs/api/MARKETING.md)** — Meta Ads (full Full-Access parity)
- **[docs/api/THREADS.md](docs/api/THREADS.md)** — Threads
- **[docs/api/PAGES.md](docs/api/PAGES.md)** — Facebook Pages (free)
- **[docs/api/INSTAGRAM.md](docs/api/INSTAGRAM.md)** — Instagram (free)

## Quick start

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…` (Developer → API Access)
- **Envelope:** success → `{ "ok": true, "data": … }`; error → `{ "ok": false, "error": { "code", "message" } }`
- **Rate limit:** 120 requests / minute per key

```bash
# 1) Onboard a client — share the returned link with them to authorise
curl -X POST https://adflowapps.com/api/v1/clients \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "displayName": "Kedai ABC" }'
# → { "ok": true, "data": { "id": "...", "onboardUrl": "https://adflowapps.com/connect/..." } }

# 2) After they authorise and you enable an ad account, list what you can operate on
curl https://adflowapps.com/api/v1/ads/accounts -H "Authorization: Bearer ak_live_..."

# 3) Create a paused campaign
curl -X POST https://adflowapps.com/api/v1/ads/act_1234567890/campaigns \
  -H "Authorization: Bearer ak_live_..." -H "Content-Type: application/json" \
  -d '{ "name": "Ramadan Sale", "objective": "OUTCOME_TRAFFIC", "status": "PAUSED" }'
```

Need an endpoint not shown? Every Meta Marketing object is reachable — see
**[docs/api/MARKETING.md](docs/api/MARKETING.md)**.
