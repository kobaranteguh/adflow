# AdFlow Instagram API

Manage your clients' Instagram Business accounts — media, comments, DMs, stories, insights — through AdFlow. **Free** (no slot charge).

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{igId}`** = a client's Instagram Business account id you onboarded and enabled.
- **Billing:** Free.

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
- **Connecting an account with no Facebook Page.** Ask for the `instagram` platform on the onboarding link (`platforms: ["instagram"]`) — that is a direct Instagram Login. The `facebook` platform only discovers Instagram accounts already linked to a Page.
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
