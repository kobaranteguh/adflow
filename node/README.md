# @adflow/sdk

Official Node.js SDK for the **AdFlow bridge** — one SDK for **Meta Marketing (Ads), Threads, and
free Facebook Pages & Instagram**, through AdFlow's Meta-App-Review-approved app. You don't apply for
App Review yourself. You pay AdFlow only for the ad-account / Threads slots you enable (Pages & IG are
free).

```
Your system → @adflow/sdk → AdFlow /api/v1 → Meta Graph API
```

## Install
```bash
npm install @adflow/sdk
```

## Quick start
```js
const { AdFlow } = require('@adflow/sdk');

const adflow = new AdFlow({ apiKey: process.env.ADFLOW_API_KEY }); // ak_live_…

// Reseller: onboard a client, share the link.
const client = await adflow.clients.create({ displayName: 'Kedai ABC' });
console.log('Send to client:', client.onboardUrl);

// Ads (paid slot)
await adflow.account('act_123').createCampaign({ name: 'Q3', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED' });

// Threads (paid slot)
await adflow.profile('17841400000000000').publish({ mediaType: 'TEXT', text: 'Hello' });

// Pages & Instagram (free)
await adflow.page('1029384').createPost({ message: 'Hi' });
```

## Surface
- `adflow.clients` — onboarding (`create()` → `onboardUrl`), list/get/delete
- `adflow.account(actId)` — campaigns, ad sets, ads, insights, audiences, pixels
- `adflow.profile(threadsId)` — publish, posts, insights
- `adflow.page(pageId)` — posts, comments, conversations, insights (free)
- `adflow.request(method, path, { query, body })` — any `/api/v1` endpoint

## Errors
Throws `AdFlowError` with `.code` (`unauthorized`, `slot_required`, `api_not_enabled`,
`rate_limited`, `not_found`, `bad_request`, `upstream_error`) and `.status`.

## License
MIT
