# AdFlow Instagram API

Manage your clients' Instagram Business accounts — media, comments, DMs, stories, insights — through AdFlow. **Free** (no slot charge).

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{igId}`** = a client's Instagram Business account id you onboarded and enabled.
- **Billing:** Free.

> **Onboard Instagram through the Instagram route — always.** Ask for `platforms: ["instagram"]`,
> whether or not the account is linked to a Facebook Page. The `"facebook"` route connects Pages
> only; it does not import Instagram accounts.
>
> Everything on this page runs on `graph.instagram.com` with an Instagram Login token. A Facebook
> Page token cannot reach it — Meta answers `(#3) Application does not have the capability to make
> this API call.` on every call, including sends that are well inside the 24-hour window. If you see
> that error, the account was connected through the wrong route: re-run onboarding with
> `platforms: ["instagram"]` and it clears immediately.

## Verified against live accounts

Last checked **31 August 2026** on a real Instagram Business account (Instagram Login), with real
writes — not mocks.

| Capability | Status |
|---|---|
| Read media, comments, DM conversations, insights, publishing quota | ✅ |
| **Reply to a comment** — `POST /instagram/comments/{id}` | ✅ reply created, confirmed on Instagram |
| **Hide / unhide a comment** — `POST /instagram/comments/{id}` `{hidden}` | ✅ both directions |
| **Delete a comment** — `DELETE /instagram/comments/{id}` | ✅ |
| **Send a DM** — `POST /instagram/{igId}/messages` | ✅ **63 sends in production**, all `201` |
| Sender actions (`mark_seen`, `typing_on`, `react`) | ✅ accepted by Meta's Send API |
| Mentions — `GET /instagram/{igId}/mentions` | ✅ |

The DM figure is not a lab number: it is 63 consecutive successful sends through this API on a live
client account over 29–30 August, each returning `201` with Meta's message id.

**What a rejection looks like, and what it means.** Sending outside the 24-hour window returns Meta
code `10` / subcode `2534022`, *"This message is sent outside of allowed window."* That is a timing
rejection — the permission is fine. Do not confuse it with `(#3) Application does not have the
capability`, which means the account was connected through the wrong onboarding route (see the box
above).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/instagram` | List the Instagram accounts you can operate on |
| GET | `/instagram/{igId}` | Account details (username, bio, follower / media counts) |
| GET | `/instagram/{igId}/media` | List published media |
| POST | `/instagram/{igId}/media` | Publish a photo / video / Reel / story / carousel |
| POST | `/instagram/{igId}/media/publish` | Publish a container created with `async: true` |
| GET | `/instagram/containers/{id}` | Container processing status |
| GET | `/instagram/{igId}/limits` | Publishing quota left (Meta: 50 posts / 24h) |
| GET | `/instagram/media/{id}` | Fetch one media |
| PATCH | `/instagram/media/{id}` | Turn commenting on / off `{ commentsEnabled }` |
| DELETE | `/instagram/media/{id}` | Delete a media (API-published only) |
| GET | `/instagram/{igId}/stories` | List stories |
| GET | `/instagram/{igId}/mentions` | Media that @tagged this account |
| GET | `/instagram/{igId}/discover` | Business Discovery — another public professional account |
| GET | `/instagram/{igId}/insights` | Account insights (reach, impressions, …) |
| GET | `/instagram/media/{id}/insights` | Media-level insights |
| GET | `/instagram/media/{id}/comments` | Read comments on a media |
| POST | `/instagram/media/{id}/comments` | Post a new comment on the media (**text only**) |
| POST | `/instagram/comments/{id}` | Reply to a comment `{ message }` — or hide / unhide it `{ hidden: true\|false }` |
| POST | `/instagram/comments/{id}/private-reply` | DM the commenter privately (once per comment, 7-day window) |
| DELETE | `/instagram/comments/{id}` | Delete a comment |
| GET | `/instagram/{igId}/conversations` | List DM conversations |
| GET | `/instagram/conversations/{id}/messages` | Read messages |
| POST | `/instagram/conversations/{id}/messages` | Reply to a DM |
| POST | `/instagram/{igId}/messages` | Send a DM by IGSID, or a sender action (`mark_seen`, `react`, …) |
| GET | `/instagram/contacts/{igsid}` | Username, name and picture for a DM contact |

**Notes**
- Endpoints under `/instagram/media/{id}/*`, `/instagram/comments/{id}`, `/instagram/conversations/{id}/*` and `/instagram/containers/{id}` need an `?igId=` query param — it tells AdFlow which onboarded account's token to use.
- **Media by URL.** Meta downloads `imageUrl` / `videoUrl` itself, so they must be public `http`/`https` URLs.
- **Publishing is two-step** (create container -> Meta processes it -> publish). By default AdFlow waits for you and returns `201` with the media id. For video and Reels send `"async": true` instead: you get `202` + a `containerId`, then poll `GET /instagram/containers/{id}?igId=...` and call `POST /instagram/{igId}/media/publish`. This keeps long video processing from timing out your request.
- **Check the quota before a batch.** `GET /instagram/{igId}/limits` returns Meta's own counter, which also counts posts made outside AdFlow — the only number that reflects reality.
- **Hashtag search is not offered.** It needs Meta's *Instagram Public Content Access*, which App Review
  rejected for this app, so the endpoint returns `forbidden` instead of pretending to work. Use
  `GET /instagram/{igId}/mentions` for accounts that tagged your client.
- **No message tags on Instagram.** `HUMAN_AGENT` is the only tag Instagram accepts and this app does
  not hold it, so replies are limited to the 24-hour window. Reach a commenter through
  `POST /instagram/comments/{id}/private-reply` instead.
- **Business Discovery** only works for public Business/Creator accounts; anything else returns `not_found`.
- **Connecting an account.** Always ask for the `instagram` platform on the onboarding link (`platforms: ["instagram"]`) — a direct Instagram Login. This is the only route to Instagram; the `facebook` platform connects Pages only and does not import Instagram accounts.
- `POST /instagram/{igId}/messages` and the conversation reply are both bound by Instagram's 24-hour messaging window.

## Examples

Publish a photo:
```bash
curl -X POST https://adflowapps.com/api/v1/instagram/{igId}/media   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "mediaType": "IMAGE", "imageUrl": "https://example.com/photo.jpg", "caption": "New arrival" }'
```

Publish a Reel without waiting (recommended for video):
```bash
# 1) create the container - returns 202 { containerId }
curl -X POST https://adflowapps.com/api/v1/instagram/{igId}/media   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "mediaType": "REELS", "videoUrl": "https://example.com/reel.mp4", "caption": "Behind the scenes", "async": true }'

# 2) poll until "ready": true
curl "https://adflowapps.com/api/v1/instagram/containers/{containerId}?igId={igId}"   -H "Authorization: Bearer ak_live_..."

# 3) publish
curl -X POST https://adflowapps.com/api/v1/instagram/{igId}/media/publish   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "containerId": "{containerId}" }'
```

Publish a carousel (2-10 items):
```bash
curl -X POST https://adflowapps.com/api/v1/instagram/{igId}/media   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{
        "mediaType": "CAROUSEL",
        "caption": "Swipe for the full set",
        "children": [{ "imageUrl": "https://example.com/1.jpg" },
                     { "imageUrl": "https://example.com/2.jpg" }]
      }'
```

Reply to a DM in an existing conversation:
```bash
curl -X POST "https://adflowapps.com/api/v1/instagram/conversations/{conversationId}/messages?igId={igId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "recipientId": "{igsid}", "message": "Hi! How can we help?" }'
```

Reply straight from a webhook (you only have the sender's IGSID):
```bash
curl -X POST https://adflowapps.com/api/v1/instagram/{igId}/messages   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "recipientId": "{igsid}", "message": "Hi! How can we help?" }'
```

Hide a comment / stop new comments on a post:
```bash
curl -X POST "https://adflowapps.com/api/v1/instagram/comments/{commentId}?igId={igId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "hidden": true }'

curl -X PATCH "https://adflowapps.com/api/v1/instagram/media/{mediaId}?igId={igId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "commentsEnabled": false }'
```

Reply privately to a commenter (lead capture):
```bash
curl -X POST "https://adflowapps.com/api/v1/instagram/comments/{commentId}/private-reply?igId={igId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "message": "Hi! Here is the price list." }'
```

Look up a competitor:
```bash
curl "https://adflowapps.com/api/v1/instagram/{igId}/discover?username=competitor&limit=9"   -H "Authorization: Bearer ak_live_..."
```

## Errors
- `not_found` — IG account not among your onboarded clients
- `api_not_enabled` — IG account not enabled for the API
- `rate_limited` — 120 req/min per key
