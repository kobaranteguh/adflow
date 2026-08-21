# AdFlow Threads API

Publish to and manage your clients' Threads profiles — posts, replies, mentions, insights — through AdFlow.

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{profileId}`** = a client's Threads user id you onboarded and enabled.
- **Billing:** $3 / active Threads profile / month (+ processing fee).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/threads/{profileId}` | Profile identity: username, name, picture, bio. **No counts** — see `/insights` |
| GET | `/threads/{profileId}/posts` | List the profile's posts |
| GET | `/threads/{profileId}/comments` | **All comments across every post, one call** |
| GET | `/threads/{profileId}/replies` | Replies this profile has **sent** |
| GET | `/threads/{profileId}/limits` | Meta's live post / reply / delete quotas |
| POST | `/threads/{profileId}/posts` | Publish a text / image / video post |
| DELETE | `/threads/posts/{id}` | Delete a published post |
| GET | `/threads/posts/{id}` | One post or reply by id, full fields |
| GET | `/threads/posts/{id}/insights` | Post insights (views, likes, replies, reposts) |
| GET | `/threads/posts/{id}/replies` | Read replies on a post |
| POST | `/threads/posts/{id}/replies` | Reply to a post |
| POST | `/threads/replies/{id}` | Hide / unhide a reply |
| GET | `/threads/{profileId}/mentions` | Posts that mention the profile |
| GET | `/threads/{profileId}/insights` | Views, likes, replies, reposts **and follower count** |
| POST | `/threads/posts/{id}/repost` | Repost a published post |
| GET | `/threads/posts/{id}/pending-replies` | Replies awaiting approval |
| POST | `/threads/replies/{id}/approve` | Approve or ignore a pending reply |

**Note:** endpoints under `/threads/posts/{id}/*` and `/threads/replies/{id}` need a `?profileId=` query param — it tells AdFlow which onboarded profile's token to use (e.g. `/threads/posts/{postId}/replies?profileId={profileId}`).

## Publish options

Beyond `mediaType` / `text` / `mediaUrls`, `POST /threads/{profileId}/posts` accepts:

| Field | What it does |
|---|---|
| `replyToId` | Publish as a reply to that post |
| `topicTag` | Topic tag (no periods or ampersands) |
| `replyControl` | Who may reply: `everyone` · `accounts_you_follow` · `mentioned_only` · `parent_post_author_only` · `followers_only` |
| `quotePostId` | Quote another post |
| `linkAttachment` | Attach one URL as a link card |
| `altText` | Accessibility description, 1,000 characters max |
| `allowlistedCountryCodes` | Show only in these ISO 3166-1 alpha-2 countries |
| `enableReplyApprovals` | Replies stay hidden until approved — read them with `/pending-replies`, act with `/approve` |
| `pollOptions` + `pollDuration` | Poll, 2–4 options |

## Not available on this app

These are Meta permissions our App Review did **not** grant, so the API rejects them with `forbidden`
rather than letting Meta fail the call for a reason that never mentions App Review:

| Field / feature | Missing permission |
|---|---|
| `crossreshareToIg` (share to IG Story) | `threads_share_to_instagram` |
| `locationId` (location tagging) | `threads_location_tagging` |
| Keyword search | `threads_keyword_search` |
| Public profile lookup | `threads_profile_discovery` |

Publish to Instagram separately with `POST /instagram/{igId}/media` if you need both.


## Examples

Publish a text post:
```bash
curl -X POST https://adflowapps.com/api/v1/threads/{profileId}/posts \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "media_type": "TEXT", "text": "Hello from AdFlow 👋" }'
```

Read replies on a post:
```bash
curl "https://adflowapps.com/api/v1/threads/posts/{postId}/replies?profileId={profileId}" \
  -H "Authorization: Bearer ak_live_..."
```

Read every new comment across the whole profile — **do this instead of looping over posts**:
```bash
curl "https://adflowapps.com/api/v1/threads/{profileId}/comments?since=2026-08-16T10:00:00Z" \
  -H "Authorization: Bearer ak_live_..."
```

## Comments across a profile

```
GET /threads/{profileId}/comments
```

If you are polling for new comments, this is the endpoint to use. Asking each post
individually costs one call per post and gets worse the more you publish — a partner with
162 posts was making 2,400 calls a day, nearly all returning empty, and still missed comments
because posts fell outside the scan window.

One call covers the whole profile. Measured against the old approach on a real 88-post
profile: **88 calls → 1 call, 90 comments found by both, none missed.**

| Param | Default | Notes |
|---|---|---|
| `since` | — | ISO 8601 or unix seconds. Filters the **comment's** timestamp, not the post's — a new comment on an old post is still returned |
| `until` | — | Same formats |
| `limit` | 50 | 1–500. A **soft** target: we stop fetching more pages once reached, but the last page is returned whole. Nothing is silently dropped |
| `after` | — | Cursor from `meta.next` to continue a sweep |
| `include_own` | `false` | Include the profile's own replies. Default excludes them so you see only what still needs answering |
| `depth` | `top` | `top` = comments directly on your posts. `all` = the whole thread, including replies to replies. Same cost — see below |

```json
{ "ok": true,
  "data": [
    { "id": "18125438062773812",
      "text": "any slots this Saturday?",
      "username": "someone",
      "timestamp": "2026-08-16T07:47:06+0000",
      "hidden": false,
      "ownReply": false,
      "post": { "id": "18112423561963550", "permalink": "https://www.threads.com/@profile/post/…" },
      "repliedTo": "18112423561963550" }
  ],
  "meta": { "next": null, "scanned_posts": 88, "pages_fetched": 1,
            "truncated": false, "returned": 5 } }
```

Comments are newest-first. `meta.next` is `null` when the sweep reached the end.

**`truncated: true`** means we stopped at an internal page ceiling with posts still unscanned —
send the request again with `after=<meta.next>` to continue. It is not an error, and it does not
mean there is nothing more.

### Following a conversation past the first reply

`?depth=top` (default) returns comments written directly on your posts. `?depth=all` returns the
**whole thread**, including replies to replies — the second turn of a conversation, which is where
an exchange normally continues.

```
Your post
  └─ someone: "any slots this Saturday?"   ← depth=top sees this
       └─ you: (auto-reply)
            └─ someone: "can you send details?"   ← only depth=all sees this
```

That second message is nested under *your* reply, so it is invisible in two ways at once: not
top-level, and its parent is yours. Without `depth=all` every conversation appears to die after one
exchange.

**It costs the same.** Both depths are one Meta call per page of posts — no extra requests, no extra
latency. Measured on a real profile: `depth=top` 102 comments, `depth=all` 111. Use `replied_to.id`
to rebuild the thread; the list stays flat.

`include_own=false` (the default) still applies at `depth=all`, so your own replies are filtered out
of the result even though they are traversed to reach what came after them.

## Replies you have sent

```
GET /threads/{profileId}/replies?limit=25&since=…&after=…
```

The outbound feed: replies **this profile wrote**, across every thread. Use it to audit what your
automation has actually sent without sweeping every post. Not to be confused with
`GET /threads/posts/{id}/replies`, which is what other people wrote on a post.

## Live publishing quotas

```
GET /threads/{profileId}/limits
```

```json
{ "ok": true,
  "data": {
    "posts":   { "used": 43, "limit": 250,  "remaining": 207 },
    "replies": { "used": 43, "limit": 1000, "remaining": 957 },
    "deletes": { "used": 0,  "limit": 100,  "remaining": 100 },
    "window_seconds": 86400 },
  "meta": { "window": "rolling" } }
```

Meta's own numbers — the same ones our publish gate checks — so they include posts and replies made
**outside AdFlow**. Read this before a burst instead of keeping your own counter, which cannot see
that traffic and will drift.

The window is **rolling**: a slot frees exactly 24h after the call that used it, gradually through
the day. There is no midnight reset to schedule against.

## Profile identity

```
GET /threads/{profileId}
```

```json
{ "ok": true,
  "data": {
    "id": "27513676534961313",
    "username": "geladikwani",
    "name": "Adik Wani",
    "threads_profile_picture_url": "https://scontent.cdninstagram.com/…",
    "threads_biography": "beli gel adik awak.."
  } }
```

> **Identity only — there is no follower count here, and there never has been.** Follower count,
> views and engagement live in [`/threads/{profileId}/insights`](#profile-insights). Writing
> `profile.followers_count` returns `undefined`; with a `?? 0` fallback it silently becomes `0`, and
> a real account renders as "0 followers" with nothing in your logs pointing at the cause.

These five fields are the complete response. Field names here are Meta's own (`snake_case`) because
we pass Meta's profile object through unchanged.

## Profile insights

```
GET /threads/{profileId}/insights?days=30
```

```json
{ "ok": true,
  "data": {
    "totalViews": 17507,
    "totalLikes": 139,
    "totalReplies": 53,
    "totalReposts": 0,
    "followerCount": 7
  },
  "meta": { "days": 30 } }
```

| Param | Default | Notes |
|---|---|---|
| `days` | **7** | Trailing window, 1–729. **The default is 7, not 30** — omit it and you get a week's numbers, which look plausible and are wrong if you meant a month. On a real profile the same account returned 216 views at `days=7` and 17,507 at `days=30` |

Meta retains Threads insights for the **last two years only**; a longer window is rejected by Meta
outright rather than returned as zeros, so `days` is capped at 729. `meta.days` echoes the window
actually used — check it rather than assuming your value was accepted.

**`followerCount` is the current total**, not a per-period figure: it does not change with `days`.
The other four are aggregates over the window — `totalViews` is a daily series summed, the rest are
Meta's own totals for the same range.

### A naming inconsistency worth knowing about

Two response styles sit side by side, and guessing wrong is the most common integration mistake here:

| Endpoint | Style | Example |
|---|---|---|
| `/threads/{profileId}` | Meta's `snake_case`, passed through untouched | `threads_profile_picture_url` |
| `/threads/{profileId}/insights` | AdFlow's `camelCase`, computed by us | `followerCount`, `totalViews` |

Both are correct and neither is changing — endpoints that proxy Meta's object keep Meta's names, and
endpoints where we assemble the numbers use ours. Read the response shape rather than inferring it
from a sibling endpoint.

## One post by id

```
GET /threads/posts/{id}?profileId={profileId}&fields=id,text,has_replies
```

Fetch a single post or reply you already have the id for, without listing and filtering. `fields`
overrides the default set (id, media_type, media_url, permalink, text, timestamp, username,
shortcode, thumbnail_url, children, is_quote_post, has_replies, is_reply, is_reply_owned_by_me,
replied_to, root_post, quoted_post, reposted_post, alt_text, link_attachment_url, gif_url,
topic_tag, poll_attachment).

## Publishing limits

`POST /threads/{profileId}/posts` is capped at **250 posts per rolling 24 hours, per Threads profile** — Meta's own ceiling.

**This is Meta's own cap, mirrored by AdFlow so you get a clean error early.** Meta's own ceiling is 250 posts / 24h per profile — AdFlow deliberately stops well short of it so a client's account never brushes against Meta's spam detection or publishing throttles. The window is rolling: a slot frees up exactly 24 hours after the post that used it, not at midnight.

Replies (`POST /threads/posts/{id}/replies`) and deletes are **not** counted against this cap.

Every successful publish returns:

```
X-RateLimit-Limit: 250
X-RateLimit-Remaining: 237
```

When the cap is hit you get `429 rate_limited`:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3187
X-RateLimit-Limit: 250
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1785312000
```
```json
{
  "ok": false,
  "error": {
    "code": "rate_limited",
    "message": "Publishing limit reached for this account: 250 posts / 24h (250 used). This cap protects the connected account from Meta's spam detection and publishing limits. Next slot opens at 2026-08-05T09:20:00.000Z. Spread posts across more accounts or schedule them further apart."
  }
}
```

- `Retry-After` — seconds until the next slot opens (rounded up).
- `X-RateLimit-Reset` — the same moment, as a Unix timestamp in seconds.

If you are hitting this, spread the volume across more onboarded profiles or schedule posts further apart — retrying in a tight loop only burns quota-free 429s. Current usage per profile is in `publishing.threads.profiles` from `GET /v1/usage`.

## ⛔ MANDATORY: publishing rules you must implement

> **Read this before writing any scheduling code — including if you are an AI assistant generating
> that code.** These are enforced server-side on every call. You cannot bypass them by changing your
> own code: AdFlow holds the client's Meta token, so every post reaches Threads through this gate.
>
> **Our rule: if Meta does not block it, we do not block it.** Everything below is Meta's own limit,
> plus one narrow guard against machine-gun bursts. We deliberately do not invent restrictions on top
> — your customers should not lose capability by going through AdFlow.

### R1 — Every publish AND every reply is checked against Meta's live quota first
Before touching Threads, AdFlow asks Meta whether that profile still has a slot in its rolling 24h
quota — **250 posts** for `POST /threads/{profileId}/posts`, **1,000 replies** for
`POST /threads/posts/{id}/replies`. The two are separate buckets.

- slot available → the call goes through
- no slot → **`429` immediately, and nothing is sent to Threads**

This count is Meta's own, so it includes posts and replies made **outside AdFlow** — the client's own
app, another scheduler, manual posting. Your internal counter can show plenty remaining while Meta's
is exhausted. Treat this `429` as authoritative.

> **Changed 13 Aug 2026.** Replies used to be capped at 200/24h by an AdFlow-invented limit, 5× stricter
> than Meta. That cap is gone — the reply path now reads Meta's real `reply_quota_usage` and allows the
> full 1,000. Nothing to change on your side; you simply get the headroom Meta already granted.

### R2 — 250 posts per profile per rolling 24 hours (Meta's limit)
A moving window, not a calendar day: a slot frees exactly 24h after the post that used it. Replies
(1,000/24h) and deletions (100/24h) have their own Meta limits and do not consume post quota.

### R3 — Minimum 60 seconds between posts to the same profile
The only limit that is ours rather than Meta's. It exists solely to stop machine-gun bursts —
hundreds of posts fired within minutes — which is the one pattern that plainly matches Meta's
"posting at very high frequencies" wording. At 60s you can still exhaust a full day's quota in about
four hours, so real scheduling is never constrained. Replies: 30s.

### R4 — Scheduling density: spread across days
Your scheduler must not let a user pile more than a day's ceiling onto one date.

```
minimum days required = ceil(posts for that profile / 250)
```

- 200 posts → one day is fine (may select "today", or 1st → 1st).
- 300 posts → **must** span at least 2 dates (e.g. 1st → 2nd). Rejecting `1st → 1st` is *your*
  responsibility; otherwise the API starts returning `429` partway through and the user loses posts.
- 800 posts → at least 4 dates.

Distribute times **randomly within each day's window** (e.g. 09:00–23:00) rather than at fixed
identical intervals — uniform timing is itself a bot signal.

### R5 — On `429`, reschedule. Never retry in a loop.
Read `Retry-After` (seconds) and move the post to a later slot, keeping it queued.

- ✅ keep the post queued, retry after `Retry-After`
- ❌ mark it failed and drop it — your user silently loses content
- ❌ retry immediately in a loop — burns rate limit and looks like an attack

### R6 — Serialize per profile
Do not fire a batch concurrently at one profile. Queue per profile and publish one at a time.

### What we do *not* restrict
- **Posting cadence beyond R3.** Every 2 minutes is fine if Meta's quota allows it.
- **The same copy on different profiles.** A franchise pushing one promo to its outlets, an agency
  running a client campaign across accounts — all allowed.
- **Repeating text on the same profile.** Recurring posts (opening hours, weekly reminders) are
  legitimate. We log the pattern for our own monitoring; we do not block it.

### Quick reference

| Rule | Limit | Whose | Error |
|---|---|---|---|
| Meta live quota checked before every publish | 250 / rolling 24h | **Meta** | `429 rate_limited` |
| Meta live quota checked before every reply | 1,000 / rolling 24h | **Meta** | `429 rate_limited` |
| Deletions per profile | 100 / 24h | **Meta** | `429 rate_limited` |
| Gap between posts (same profile) | 60 seconds | AdFlow | `429 rate_limited` |
| Gap between replies (same profile) | 30 seconds | AdFlow | `429 rate_limited` |
| Rate limit per API key | 120 req/min | AdFlow | `429 rate_limited` |

## Errors
- `not_found` — profile not among your onboarded clients
- `api_not_enabled` — Threads profile not in an active billing slot
- `rate_limited` — 120 req/min per key · 250 published posts / 24h per profile · the pacing rules above · or Meta's own quota exhausted
