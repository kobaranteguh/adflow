# AdFlow Instagram API

Manage your clients' Instagram Business accounts — media, comments, DMs, stories, insights — through AdFlow. **Free** (no slot charge).

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{igId}`** = a client's Instagram Business account id you onboarded and enabled.
- **Billing:** Free.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/instagram/{igId}/media` | List published media |
| POST | `/instagram/{igId}/media` | Publish a photo / video / Reel / carousel |
| GET | `/instagram/{igId}/stories` | List stories |
| GET | `/instagram/{igId}/insights` | Account insights (reach, impressions, …) |
| GET | `/instagram/media/{id}/insights` | Media-level insights |
| GET | `/instagram/media/{id}/comments` | Read comments on a media |
| POST | `/instagram/media/{id}/comments` | Reply to a comment |
| DELETE | `/instagram/comments/{id}` | Delete a comment |
| POST | `/instagram/comments/{id}` | Hide / unhide a comment |
| GET | `/instagram/{igId}/conversations` | List DM conversations |
| GET | `/instagram/conversations/{id}/messages` | Read messages |
| POST | `/instagram/conversations/{id}/messages` | Reply to a DM |

## Examples

Publish a photo:
```bash
curl -X POST https://adflowapps.com/api/v1/instagram/{igId}/media \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "image_url": "https://example.com/photo.jpg", "caption": "New arrival 🛍️" }'
```

Reply to a DM:
```bash
curl -X POST https://adflowapps.com/api/v1/instagram/conversations/{conversationId}/messages \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "message": "Hi! How can we help?" }'
```

## Errors
- `not_found` — IG account not among your onboarded clients
- `api_not_enabled` — IG account not enabled for the API
- `rate_limited` — 120 req/min per key
