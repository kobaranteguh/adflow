# AdFlow Facebook Pages API

Manage your clients' Facebook Pages — posts, comments, Messenger, insights — through AdFlow. **Free** (no slot charge).

- **Base URL:** `https://adflowapps.com/api/v1`
- **Auth:** `Authorization: Bearer ak_live_…`
- **`{pageId}`** = a client's Page id you onboarded and enabled.
- **Billing:** Free.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/pages` | List the Pages you can operate on |
| GET | `/pages/{pageId}` | Page details (name, category, fan / follower counts, picture) |
| PATCH | `/pages/{pageId}` | Update Page profile fields / a settings toggle |
| GET | `/pages/{pageId}/posts` | List Page posts |
| POST | `/pages/{pageId}/posts` | Publish a text or link post |
| GET | `/pages/{pageId}/photos` | List the Page's photo library |
| POST | `/pages/{pageId}/photos` | Publish a photo / multi-photo post (1–10 image URLs) |
| GET | `/pages/{pageId}/videos` | List the Page's video library |
| POST | `/pages/{pageId}/videos` | Publish a video from a public URL |
| GET | `/pages/posts/{id}` | Fetch one post |
| PATCH | `/pages/posts/{id}` | Edit a post's message |
| DELETE | `/pages/posts/{id}` | Delete a post |
| GET | `/pages/posts/{id}/comments` | Read a post's comments |
| POST | `/pages/posts/{id}/comments` | Comment on a post as the Page (text + one image/GIF) |
| POST | `/pages/comments/{id}` | Reply to a comment (text + one image/GIF), or hide/unhide it |
| POST | `/pages/comments/{id}/likes` | Like a comment as the Page |
| DELETE | `/pages/comments/{id}/likes` | Remove the Page's like |
| POST | `/pages/comments/{id}/private-reply` | DM the commenter privately (once per comment, 7-day window) |
| DELETE | `/pages/comments/{id}` | Delete a comment |
| GET | `/pages/posts/{id}/insights` | Post insights |
| GET | `/pages/{pageId}/insights` | Page insights |
| GET | `/pages/{pageId}/ratings` | Recommendations / reviews left on the Page |
| GET | `/pages/{pageId}/tagged` | Posts and photos that tagged this Page |
| GET | `/pages/{pageId}/scheduled-posts` | Posts scheduled for a future date |
| GET | `/pages/{pageId}/conversations` | List Messenger conversations |
| GET | `/pages/conversations/{id}/messages` | Read messages in a conversation |
| POST | `/pages/conversations/{id}/messages` | Reply to a conversation (24h window) |
| POST | `/pages/{pageId}/messages` | Send a message by PSID (24h window) |
| POST | `/pages/{pageId}/attachments` | Upload a file once, get a reusable `attachment_id` |
| GET | `/pages/contacts/{psid}` | Display name + picture for a Messenger contact |
| GET | `/pages/{pageId}/subscriptions` | Which webhook fields this Page is subscribed to |
| POST | `/pages/{pageId}/subscriptions` | (Re)subscribe this Page to webhooks |
| DELETE | `/pages/{pageId}/subscriptions` | Unsubscribe this Page from webhooks |

**Notes**
- Endpoints under `/pages/posts/{id}/*`, `/pages/comments/{id}` and `/pages/conversations/{id}/messages` need a `?pageId=` query param — it tells AdFlow which onboarded Page's token to use (e.g. `/pages/comments/{commentId}?pageId={pageId}`).
- `POST /pages/conversations/{id}/messages` and `POST /pages/{pageId}/messages` are subject to Messenger's 24-hour window: you may only reply within 24 hours of the user's last message. Use the PSID form when you are reacting to a webhook — webhooks carry the sender's PSID, not a conversation id.
- **Media by URL.** Photos and videos are published from public URLs — Meta downloads them, so the URL must be reachable from the internet (`http`/`https`, no `localhost`, no `data:`). Videos are processed asynchronously by Meta: the response returns immediately and the video appears on the Page moments later.
- **Scheduling.** `POST /pages/{pageId}/posts`, `/photos` and `/videos` accept `scheduledPublishTime` — a unix timestamp **in seconds**, between 10 minutes and 75 days from now. An out-of-range or non-integer value is rejected with `bad_request` rather than silently publishing now.
- **The 24-hour window is hard here.** Meta's `HUMAN_AGENT` tag would extend it to 7 days, but this app
  does not hold that feature — App Review rejected it — so any `tag` you send is refused with
  `forbidden` before it reaches Meta. Two paths remain: reply inside 24 hours, or open a fresh thread
  from a public comment with `POST /pages/comments/{id}/private-reply` (7 days, once per comment).
- **Sending media in a DM.** Pass `attachmentUrl` (plus optional `attachmentType`: `image` · `video` ·
  `audio` · `file`) instead of `message`. Meta downloads the URL; the limit is **25MB** per file. If you
  send the same file repeatedly, upload it once and pass `attachmentId` instead — Meta then skips the
  download. Links in plain `message` text are clickable as-is.
- **Text length.** Messenger accepts up to 2000 characters; longer is rejected with `bad_request`.
- **Reusable attachments.** `POST /pages/{pageId}/attachments` with `{ "url": "…", "type": "image" }`
  returns `{ "attachment_id": "…" }`. Send it with `{"attachmentId":"…"}` — Meta then skips the
  download entirely. **The id expires after 90 days**; store the upload date and refresh before then,
  or sends start failing. Pass `"platform":"instagram"` on upload to get an id usable in IG DMs (that
  route needs the Page id, so it only covers Instagram accounts linked to a Page).
- **Catalogue cards.** Send `template` instead of `message` for a generic-template carousel — image,
  title, subtitle and up to 3 buttons per card, up to 10 cards. Meta rejects the whole message if any
  card breaks a limit and does not say which; we validate first and name the offending card and field
  (`template[3].buttons[1].url`). Buttons are `web_url` or `postback` only. A message carries either a
  template or an attachment, never both.
- **Webhooks stop silently.** If a client removes the app or changes Page roles, Meta drops the subscription and events simply stop — with no error anywhere. `GET /pages/{pageId}/subscriptions` shows the truth; `POST` restores it without the client re-authorising.
- **What a comment can carry.** Text plus **one** image (`imageUrl`), one GIF (`gifUrl`), or one
  pre-uploaded photo (`attachmentId`) — never more than one. **Video cannot be attached to a comment**:
  Meta has no parameter for it on the comments edge, so `videoUrl` is rejected with `bad_request`
  rather than silently dropped. Links need nothing special — a URL inside `message` is clickable.
- **Hiding vs deleting a comment.** `{ "hidden": true }` hides a comment (still visible to its author); `DELETE` removes it. Same body shape as the Instagram comments endpoint.

## Examples

Publish a Page post:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/posts \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "message": "New promo this weekend!" }'
```

Publish a 3-photo post:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/photos   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{
        "message": "Raya collection is live",
        "imageUrls": ["https://cdn.example.com/1.jpg",
                      "https://cdn.example.com/2.jpg",
                      "https://cdn.example.com/3.jpg"]
      }'
```

Publish a video:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/videos   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "videoUrl": "https://cdn.example.com/promo.mp4", "description": "30s promo" }'
```

Hide a comment:
```bash
curl -X POST "https://adflowapps.com/api/v1/pages/comments/{commentId}?pageId={pageId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "hidden": true }'
```

Reply to a comment:
```bash
curl -X POST "https://adflowapps.com/api/v1/pages/comments/{commentId}?pageId={pageId}" \
  -H "Authorization: Bearer ak_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "message": "Thanks for your comment!" }'
```

Comment on a post with a photo:
```bash
curl -X POST "https://adflowapps.com/api/v1/pages/posts/{postId}/comments?pageId={pageId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "message": "Price list below", "imageUrl": "https://cdn.example.com/price.jpg" }'
```

Send a video in a Messenger reply:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/messages   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "recipientId": "{psid}", "attachmentUrl": "https://cdn.example.com/clinic.mp4", "attachmentType": "video" }'
```

Send a catalogue card:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/messages   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{
        "recipientId": "{psid}",
        "template": [{
          "title": "Panadol Extra 20s",
          "subtitle": "RM12.90 - in stock",
          "imageUrl": "https://cdn.example.com/panadol.jpg",
          "buttons": [
            { "type": "web_url",  "title": "Order",  "url": "https://shop.example.com/panadol" },
            { "type": "postback", "title": "Ask us", "payload": "SKU_PANADOL" }
          ]
        }]
      }'
```

Upload once, send many times:
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/attachments   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "url": "https://cdn.example.com/catalogue.jpg", "type": "image" }'
# -> { "ok": true, "data": { "attachment_id": "1857777774821032" }, "meta": { "expiresInDays": 90 } }

curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/messages   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "recipientId": "{psid}", "attachmentId": "1857777774821032" }'
```

Reply privately to a commenter (lead capture):
```bash
curl -X POST "https://adflowapps.com/api/v1/pages/comments/{commentId}/private-reply?pageId={pageId}"   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "message": "Hi! Sent you the price list here." }'
```

Reply after the 24-hour window (human agent, up to 7 days):
```bash
curl -X POST https://adflowapps.com/api/v1/pages/{pageId}/messages   -H "Authorization: Bearer ak_live_..."   -H "Content-Type: application/json"   -d '{ "recipientId": "{psid}", "message": "Sorry for the delay!", "messagingType": "MESSAGE_TAG", "tag": "HUMAN_AGENT" }'
```

## Real-time webhooks
Register a callback at **Developer → API Access → Webhooks**. AdFlow relays Page events (new comments, messages) to your URL, signed with `X-AdFlow-Signature`.

## Errors
- `not_found` — Page not among your onboarded clients
- `api_not_enabled` — Page not enabled for the API
- `rate_limited` — 120 req/min per key
