# Meta Policy & Compliance

How AdFlow's bridge stays compliant with Meta, and what that means for partners. AdFlow operates a
**Meta-verified Tech Provider** app; partners use that approved access rather than obtaining their own.

---

## 1. AdFlow's Meta verification status

The AdFlow Meta app holds:

| Verification | Status | What it enables |
| ------------ | ------ | --------------- |
| **Business verification** | ✅ Verified | Access to user data / advanced access |
| **Access verification (Tech Provider)** | ✅ Verified | Access to the **Meta business assets of *other* businesses** — the basis of the reseller model |
| App publishing | ✅ Published (Live) | App is live, not in development mode |

Because AdFlow is a verified Tech Provider, a partner can manage their clients' Meta assets through
AdFlow **without** their own Business Verification, Tech Provider status, or App Review.

---

## 2. Who Meta attributes calls to

Every Graph API call AdFlow makes uses **AdFlow's app credentials + the client's access token**
(obtained when the client authorised AdFlow's app). Meta therefore sees *AdFlow's app acting on
behalf of the client's account*. It does **not** see the partner's system or the partner API key
(`ak_live_…`) — those are internal to AdFlow.

Implication: all activity counts against **AdFlow's app standing and rate limits**. Partners must use
the API responsibly; abuse affects the shared app. AdFlow enforces per-key rate limits and logging to
protect this.

---

## 3. Permissions in use

| Platform | Permissions |
| -------- | ----------- |
| Ads | `ads_management`, `ads_read`, `business_management` (Marketing API access tier) |
| Threads | `threads_basic`, `threads_content_publish`, `threads_manage_insights`, `threads_manage_replies`, `threads_read_replies` |
| Pages | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_messaging` |
| Instagram | `instagram_business_*` (Pages-linked import live; standalone endpoints pending) |

Advanced Access for these is governed by AdFlow's App Review. Some permissions may still be expanding
to Standard/Advanced tiers — the Marketing API access tier in particular scales limits with verified
ad spend.

---

## 4. Rate limits (Meta-side)

These apply to **AdFlow's app as a whole** (shared across all partners):
- **App-level** — tracked via the `X-App-Usage` header (call count / CPU / time as % of allowance).
- **Business Use Case (BUC)** — per business asset for Pages/IG/Marketing, via
  `X-Business-Use-Case-Usage` (includes `estimated_time_to_regain_access` when throttled).
- **Marketing API tier** — `development` vs `standard`; standard scales with spend & active ads.

AdFlow adds a per-API-key limit (120 req/min) so one partner can't exhaust the shared quota; exceed →
`429 rate_limited` with `Retry-After`. Always back off on `429`.

---

## 5. Hard limitations (Meta, not AdFlow)

- Threads: cannot delete published posts; 250 posts / 1,000 replies per 24h per profile.
- Facebook Pages: an app can only edit/delete posts **it** published; Messenger sending must be within
  the **24-hour** standard messaging window.
- Instagram: cannot delete published media or edit captions via API; DM only within the human-agent
  window.

---

## 6. Partner responsibilities

- Obtain proper consent from your clients before onboarding their Meta accounts.
- Use the access only for the client's stated business purpose.
- Respect Meta's Platform Terms and advertising policies — violations can affect AdFlow's app for
  everyone.
- Secure your `ak_live_…` keys and webhook secrets; rotate/revoke if leaked.

---

## 7. Resale & Platform Terms

Reselling access to Meta APIs may engage Meta's Platform Terms. AdFlow's verified Tech Provider status
covers technical access to other businesses' assets; partners should review Meta's Platform Terms for
their own resale arrangements and ensure end-client agreements are in place.

> References: Meta Graph API "Rate Limiting", "Business Verification", "Access Verification / Tech
> Provider", Marketing API "Rate Limiting & Access Levels", and the Meta Platform Terms.
