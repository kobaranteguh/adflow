# AdFlow Threads API

Publish to and manage your clients' Threads profiles — posts, replies, mentions, insights — through AdFlow.

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{profileId}`** = a client's Threads user id you onboarded and enabled.
- **Billing:** $1 / active Threads profile / month (+ processing fee).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/threads/{profileId}` | Profile details (username, picture, counts) |
| GET | `/threads/{profileId}/posts` | List the profile's posts |
| POST | `/threads/{profileId}/posts` | Publish a text / image / video post |
| DELETE | `/threads/posts/{id}` | Delete a published post |
| GET | `/threads/posts/{id}/insights` | Post insights (views, likes, replies, reposts) |
| GET | `/threads/posts/{id}/replies` | Read replies on a post |
| POST | `/threads/posts/{id}/replies` | Reply to a post |
| POST | `/threads/replies/{id}` | Hide / unhide a reply |
| GET | `/threads/{profileId}/mentions` | Posts that mention the profile |
| GET | `/threads/{profileId}/insights` | Profile-level insights |

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
curl https://adflowapps.com/api/v1/threads/posts/{postId}/replies \
  -H "Authorization: Bearer ak_live_..."
```

## Errors
- `not_found` — profile not among your onboarded clients
- `api_not_enabled` — Threads profile not in an active billing slot
- `rate_limited` — 120 req/min per key
