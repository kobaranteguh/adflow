# AdFlow Facebook Pages API

Manage your clients' Facebook Pages — posts, comments, Messenger, insights — through AdFlow. **Free** (no slot charge).

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{pageId}`** = a client's Page id you onboarded and enabled.
- **Billing:** Free.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/pages/{pageId}/posts` | List Page posts |
| POST | `/pages/{pageId}/posts` | Publish a post |
| DELETE | `/pages/posts/{id}` | Delete a post |
| GET | `/pages/posts/{id}/comments` | Read a post's comments |
| POST | `/pages/comments/{id}` | Reply to a comment |
| DELETE | `/pages/comments/{id}` | Delete a comment |
| GET | `/pages/posts/{id}/insights` | Post insights |
| GET | `/pages/{pageId}/insights` | Page insights |
| GET | `/pages/{pageId}/conversations` | List Messenger conversations |
| GET | `/pages/conversations/{id}/messages` | Read messages in a conversation |
| POST | `/pages/conversations/{id}/messages` | Reply to a conversation (24h window) |

## Examples

Publish a Page post:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/posts \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "message": "New promo this weekend!" }'
```

Reply to a comment:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/comments/{commentId} \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "message": "Thanks for your comment!" }'
```

## Real-time webhooks
Register a callback at **Developer → API Access → Webhooks**. AdFlow relays Page events (new comments, messages) to your URL, signed with `X-AdFlow-Signature`.

## Errors
- `not_found` — Page not among your onboarded clients
- `api_not_enabled` — Page not enabled for the API
- `rate_limited` — 120 req/min per key
