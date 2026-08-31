# AdFlow Partner API — Changelog

Partner-facing changes to the AdFlow API (`/api/v1`). Newest first. The API is versioned by path
(`/v1`); additive changes ship in place, breaking changes would ship under a new version path.

## 2026-08-31

### Changed — Instagram connects through the Instagram route only

The `"facebook"` onboarding route no longer imports Instagram accounts linked to a Page. It connects
Pages. To connect Instagram, ask for `platforms: ["instagram"]` — **whether or not** the account has a
Facebook Page. A client who needs both runs two onboardings; order does not matter.

This is a behaviour change, so read it even if you think it does not touch you.

**Why.** Instagram messaging, publishing and reads run on `graph.instagram.com` with an Instagram
Login token. The permissions AdFlow holds for Instagram are the `instagram_business_*` family, and
they only work on that host. A Facebook Page token cannot reach the Instagram surface at all — Meta
answers `(#3) Application does not have the capability to make this API call.`

The old behaviour stored the Page token against the discovered Instagram account. Those resources
could never send, publish or read. Worse, re-running the Facebook onboarding for a client who *had*
connected Instagram properly would overwrite their working token with the broken one — silently, with
no error at onboarding time, and no signal until every subsequent call started failing. That happened
to a live account on 30 August: 65 successful sends, then 25 consecutive failures beginning 60 seconds
after the token was replaced.

**What you should do.** If you onboarded an Instagram account through `"facebook"`, re-run the
onboarding with `platforms: ["instagram"]`. Same resource, same id, same slot — only the token
changes. A quick way to tell: if `POST /instagram/{igId}/messages` returns `(#3) ... capability`
inside the 24-hour window, that account came in through the wrong route.

We have also added a guard: a Page token can no longer replace an Instagram Login token on an
Instagram resource, on any code path.

### Changed — Meta Graph version is now `v25.0`

The ads, Pages and Instagram surfaces now call Graph `v25.0` (was `v21.0` / `v23.0`), matching the
version our webhook subscriptions are pinned to. You never send a version yourself, so there is
nothing to change on your side. Verified against live accounts before the switch: reads returned
byte-identical responses on v21, v25 and v26, and campaign-creation validation behaved identically.

## 2026-08-17

### Added — `?depth=all`: follow a conversation past the first reply
`GET /threads/{profileId}/comments?depth=all` returns the whole thread, including replies to replies.
The default stays `depth=top` (comments directly on your posts).

The second turn of a conversation is nested under *your* reply, so it was invisible in two ways at
once — not top-level, and its parent is yours. Without this, every exchange appeared to end after one
message.

**No extra cost.** Both depths are one Meta call per page of posts. Measured on a real profile:
`depth=top` 102 comments, `depth=all` 111 — the 9 extra are replies-to-replies. `depth` values other
than `top`/`all` return `400`.

### Added — `GET /threads/{profileId}/limits`: Meta's live quotas
Posts, replies and deletes, each with `used` / `limit` / `remaining` on its own rolling 24h window.

These are Meta's own counters — the same ones our publish gate checks — so they include activity from
outside AdFlow. Previously you could only infer headroom from the `X-RateLimit-*` headers we attach
after a publish, or keep a local counter that cannot see that traffic and drifts. Read this before a
burst instead.

### Added — `GET /threads/{profileId}/replies`: replies you have sent
The outbound feed — replies this profile wrote, across every thread, newest first, with cursor
pagination and `since`/`until`. Audit what your automation actually sent without sweeping every post.
Distinct from `GET /threads/posts/{id}/replies`, which is what other people wrote on a post.

### Added — `GET /threads/posts/{id}`: one post by id
Fetch a single post or reply you already have the id for, instead of listing and filtering. `?fields=`
overrides the default field set.

## 2026-08-16

### Added — `GET /threads/{profileId}/comments`: every comment, one call
Polling for new comments no longer costs one call per post.

```
GET /v1/threads/{profileId}/comments?since=2026-08-16T10:00:00Z&limit=100
```

- **`since` filters the comment's timestamp, not the post's.** A new comment on a three-month-old
  post is still returned. Scanning by post age was the flaw in the old pattern, not just its cost.
- Own replies excluded by default (`include_own=true` to include them), `hidden` included, cursor
  pagination via `meta.next`.
- `limit` is a soft target — we stop fetching pages once it is reached but return the final page
  whole. Truncating mid-page would make the cursor skip the rest of that page permanently.
- `meta.truncated: true` means an internal page ceiling was hit with posts still unscanned; resend
  with `after=<meta.next>`. Not an error.

Measured against the per-post approach on a real 88-post profile: **88 calls → 1, 90 comments found
by both, zero missed.**

**v1 returns top-level comments only.** `?depth=all` (replies to replies) is reserved and currently
returns `400` rather than silently succeeding.

Raised by a partner whose 162-post account was making 2,400 calls a day to ask "anything new?" —
nearly all returning empty — and still only saw 3 of 12 incoming replies, because the rest never
entered the scan window. `GET /threads/posts/{id}/replies` is unchanged for per-post reads.

## 2026-08-13

### Changed — reply cap removed; Meta's real 1,000/24h quota now applies
`POST /threads/posts/{id}/replies` used to be capped at **200 replies / 24h per profile** — a limit
AdFlow invented, 5× stricter than Meta's. It is gone.

- The reply path now reads Meta's live `reply_quota_usage` (**1,000 / rolling 24h**) from the same
  `threads_publishing_limit` endpoint already used for post quota, and gates on that.
- The count is Meta's own, so it includes replies made **outside AdFlow**. Where it used to be
  possible to be blocked by us while Meta still had room, that no longer happens.
- If Meta cannot be read (network issue, token lacking `threads_manage_replies`), the call is
  **allowed through** — a metadata failure must not block legitimate traffic.
- `429 rate_limited` on replies now means Meta's quota is genuinely exhausted, and carries
  `X-RateLimit-Limit` / `X-RateLimit-Remaining`.

**Unchanged:** the 30-second minimum gap between replies to the same profile. That guard targets
burst frequency (Meta's spam signal), not quota, and stays.

Same principle as the 2026-08-11 publishing change: what Meta does not block, we do not block.

## 2026-08-11

### Added — `platforms` on client onboarding
`POST /clients` and `POST /clients/{id}/onboard-link` now accept an optional `platforms` array
(`"ads"`, `"facebook"`, `"threads"`). The connect page offers only those, so a single-platform
product no longer shows its customers options it does not support. Omit it and every configured
platform is offered, exactly as before. Per-link, not per-account.

### Added — `returnUrl` on client onboarding
`POST /clients` and `POST /clients/{id}/onboard-link` now accept an optional `returnUrl`. After the
client finishes authorising Meta, they are sent back there instead of being left on AdFlow's
"Connected!" page — the piece white-label products were missing. `https://` only; any host, so your
customers' own domains work. The redirect carries only `?success=true` or `?error=…`; confirm the
real outcome via `GET /clients`. Omitting it keeps the previous behaviour exactly.

### Changed — publishing rules now follow Meta, not our own guesses
Threads publishing limits were realigned to Meta's documented ones:

- **Daily cap raised to 250 posts / rolling 24h per profile** (was 100). This is Meta's own ceiling;
  we no longer impose a lower one of our own.
- **Every publish is now checked against Meta's live quota first**, on *all* paths. If Meta says the
  profile is out of slots, the call returns `429` and nothing is sent to Threads. That count includes
  posts made outside AdFlow, so it is authoritative where your own counter is not.
- **Removed:** the block on reusing identical text (same profile, or across profiles). Meta does not
  hard-block this and there are legitimate uses — recurring posts, a franchise running one promo
  across its outlets. We log the pattern for monitoring instead of rejecting it.
- **Kept:** a 60-second minimum between posts to the same profile (30s for replies) — a narrow guard
  against machine-gun bursts, the one pattern that plainly meets Meta's "very high frequencies"
  wording. At 60s a full day's quota is still reachable in about four hours.

Net effect: fewer rejections, and the ones that remain are Meta's own limits rather than ours. See
[Threads](./api/THREADS.md#-mandatory-publishing-rules-you-must-implement).

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
