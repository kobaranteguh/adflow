# AdFlow Partner API — Changelog

Partner-facing changes to the AdFlow API (`/api/v1`). Newest first. The API is versioned by path
(`/v1`); additive changes ship in place, breaking changes would ship under a new version path.

## 2026-06-17

### Added — Full Access parity
The Marketing API now mirrors what Meta grants AdFlow at the **Full Access tier**:
- **Ad accounts:** detail, funding, spend-cap.
- **Campaigns / ad sets / ads:** full update (any Meta field) + delete.
- **Creatives & media:** create/list creatives, image & video upload, ad preview.
- **Audiences & targeting:** custom/lookalike/website/engagement, delete, hashed member upload,
  reach-estimate, targeting search & validate.
- **Insights:** per-level (campaign/adset/ad), breakdowns, custom date ranges, async report jobs,
  **CSV export** (`?format=csv`).
- **Pixels & conversions:** create pixel, health, diagnostics, **Conversions API** server events,
  custom conversions, offline conversion sets + events.
- **Lead Ads:** list forms, form schema, retrieve leads; `leadgen` webhook relay.
- **Asset selection:** list Pages, list Instagram accounts, list businesses.
- **Scheduled reports:** `/ads/{acc}/scheduled-reports` (daily/weekly/monthly, JSON or CSV, delivered
  to your webhook).

### Added — programmatic client activation
- `POST /v1/clients/{id}/resources/{rid}/enable` and `/disable` — activate a client's resource for
  your API key **without the dashboard**. Closes the gap where onboarding wasn't fully programmatic.
  Get `{rid}` from `GET /v1/clients/{id}`. Free during the beta; `{ "autoBuy": true }` buys a slot
  when billing is live.

### Added — pagination
- All list endpoints accept `?paginate=1` / `?after=<cursor>` → `{ items, paging: { after, has_next } }`.
  Default (no param) returns the full array (unchanged).

### Fixed
- `GET /v1/ads/accounts` now lists the **onboarded clients'** ad accounts (the set the rest of the
  Ads API operates on). Previously it could return the partner's own accounts, which then failed with
  `not_found` on follow-up calls.

### Changed — docs
- Repo is **REST-only**: removed the unpublished Node/PHP/Python SDK packages; all examples are now
  `curl`. Added a copy-paste **AI prompt** ([MARKETING-AI-PROMPT.md](./MARKETING-AI-PROMPT.md)) and a
  complete 26-section [Marketing reference](./api/MARKETING.md).

### Beta
- The API is in a **free beta** — no charges while you test. Billing ($2/ad account/mo, $1/Threads
  profile/mo; Pages & Instagram free) starts when the beta ends; we'll announce before it does.

## Roadmap (not yet available)
- Catalog / product ads (pending Meta `catalog_management` review).
- Lead-form **create** (pending `pages_manage_ads` review).
- Business system-user management (enterprise).
