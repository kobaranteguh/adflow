# AdFlow Partner SDK

One official SDK per language for the **AdFlow bridge** (`/api/v1`) — covering **Meta Marketing
(Ads), Threads, and free Facebook Pages & Instagram** in a single package. You pay AdFlow only for
the ad-account / Threads **slots you enable** (Pages & IG are free); billing is auto-charged to the
**partner's** Stripe card.

| Language | Folder | Package | Install |
| -------- | ------ | ------- | ------- |
| Node.js  | `node`   | `@adflow/sdk`  | `npm install @adflow/sdk` |
| PHP      | `php`    | `adflow/sdk`   | `composer require adflow/sdk` |
| Python   | `python` | `adflow-sdk`   | `pip install adflow-sdk` |

## 📚 Documentation

- **[docs/PARTNER-GUIDE.md](docs/PARTNER-GUIDE.md)** — start here: concepts, onboarding, SDK usage, billing, webhooks, FAQ
- **[docs/API-REFERENCE.md](docs/API-REFERENCE.md)** — every endpoint, params, responses, curl examples
- **[docs/META-POLICY.md](docs/META-POLICY.md)** — Meta compliance, verified Tech Provider status, rate limits, limitations

## SDK surface

Same shape in every language — one `AdFlow` client:
- `new AdFlow({ apiKey })` — Bearer auth with an `ak_live_…` key (Developer → API Access).
- `.clients` — reseller onboarding: `create({displayName})` → `onboardUrl` to share with the client.
- `.account(actId)` — Ads (campaigns, ad sets, ads, insights, audiences, pixels).
- `.profile(threadsId)` — Threads (publish, posts, insights).
- `.page(pageId)` — Facebook Pages (free).
- `.instagram(igId)` — Instagram (free): publish, comments, insights, DMs.
- `.request(method, path, …)` — escape hatch for any `/api/v1` endpoint.
- Errors throw `AdFlowError` with `.code` + `.status`.

## Publishing to GitHub (push later)

Each folder is a standalone package → its own repo. From a package folder:

```bash
cd node
git init && git add . && git commit -m "v0.1.0"
git branch -M main
git remote add origin https://github.com/<org>/sdk-node.git
git push -u origin main
git tag v0.1.0 && git push --tags
```

Suggested repo names: `sdk-node`, `sdk-php`, `sdk-python`. Then publish:
`npm publish --access public` (needs the `@adflow` npm org), Packagist (PHP), `twine upload` (Python).

> Status: **v0.1.0**, built & lint-clean (Node loads, `php -l` clean, `py_compile` clean).
> Not yet pushed — awaiting GitHub org/credentials.
