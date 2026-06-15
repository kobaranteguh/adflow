'use strict';

/**
 * @adflow/sdk — official Node SDK for the AdFlow bridge.
 * One SDK for everything: Meta Marketing (Ads), Threads, and free Facebook Pages
 * & Instagram — through AdFlow's Meta-App-Review-approved app. You pay AdFlow only
 * for the ad-account / Threads slots you enable; Pages & IG are free.
 * Zero dependencies (Node >= 18).
 */

class AdFlowError extends Error {
  constructor(message, { code, status, retryAfterMs } = {}) {
    super(message);
    this.name = 'AdFlowError';
    this.code = code || 'error';
    this.status = status;
    if (retryAfterMs) this.retryAfterMs = retryAfterMs;
  }
}

class HttpClient {
  constructor({ apiKey, baseUrl = 'https://adflowapps.com', timeout = 20000 } = {}) {
    if (!apiKey) throw new AdFlowError('apiKey is required', { code: 'config' });
    this._apiKey = apiKey;
    this._base = baseUrl.replace(/\/$/, '') + '/api/v1';
    this._timeout = timeout;
  }
  async request(method, path, { query, body } = {}) {
    let url = this._base + path;
    if (query && Object.keys(query).length) {
      const qs = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
      ).toString();
      if (qs) url += (path.includes('?') ? '&' : '?') + qs;
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this._timeout);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this._apiKey}`, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      throw new AdFlowError(e.name === 'AbortError' ? 'Request timed out' : e.message, { code: 'network' });
    } finally { clearTimeout(t); }
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok || (json && json.ok === false)) {
      const err = (json && json.error) || {};
      throw new AdFlowError(err.message || `HTTP ${res.status}`, { code: err.code || 'error', status: res.status });
    }
    return json ? json.data : null;
  }
}

// ── Clients (reseller onboarding) ──────────────────────────────────────────────
class Clients {
  constructor(http) { this._http = http; }
  list() { return this._http.request('GET', '/clients'); }
  get(id) { return this._http.request('GET', `/clients/${id}`); }
  /** Create a client → { id, onboardUrl }. Share onboardUrl with your client. */
  create({ displayName, externalRef } = {}) { return this._http.request('POST', '/clients', { body: { displayName, externalRef } }); }
  delete(id) { return this._http.request('DELETE', `/clients/${id}`); }
}

// ── Ads (per ad-account scope) ─────────────────────────────────────────────────
class AdAccountScope {
  constructor(http, accountId) { this._http = http; this._id = accountId; }
  campaigns(query) { return this._http.request('GET', `/ads/${this._id}/campaigns`, { query }); }
  createCampaign(body) { return this._http.request('POST', `/ads/${this._id}/campaigns`, { body }); }
  updateCampaign(id, body) { return this._http.request('POST', `/ads/campaigns/${id}`, { query: { accountId: this._id }, body }); }
  deleteCampaign(id) { return this._http.request('DELETE', `/ads/campaigns/${id}`, { query: { accountId: this._id } }); }
  adsets(campaignId, query) { return this._http.request('GET', `/ads/${this._id}/adsets`, { query: { campaignId, ...query } }); }
  createAdSet(body) { return this._http.request('POST', `/ads/${this._id}/adsets`, { body }); }
  updateAdSet(id, body) { return this._http.request('POST', `/ads/adsets/${id}`, { query: { accountId: this._id }, body }); }
  ads(query) { return this._http.request('GET', `/ads/${this._id}/ads`, { query }); }
  createAd(body) { return this._http.request('POST', `/ads/${this._id}/ads`, { body }); }
  updateAd(id, body) { return this._http.request('POST', `/ads/ads/${id}`, { query: { accountId: this._id }, body }); }
  insights(query) { return this._http.request('GET', `/ads/${this._id}/insights`, { query }); }
  audiences() { return this._http.request('GET', `/ads/${this._id}/audiences`); }
  createAudience(body) { return this._http.request('POST', `/ads/${this._id}/audiences`, { body }); }
  pixels() { return this._http.request('GET', `/ads/${this._id}/pixels`); }
  pixelStats(pixelId) { return this._http.request('GET', `/ads/pixels/${pixelId}/stats`, { query: { accountId: this._id } }); }
}

// ── Threads (per profile scope) ─────────────────────────────────────────────────
class ThreadsScope {
  constructor(http, profileId) { this._http = http; this._id = profileId; }
  profile() { return this._http.request('GET', `/threads/${this._id}`); }
  posts(query) { return this._http.request('GET', `/threads/${this._id}/posts`, { query }); }
  /** Publish: { mediaType:"TEXT"|"IMAGE"|"VIDEO"|"CAROUSEL"|"POLL", text?, mediaUrls?, pollOptions?, replyToId? } */
  publish(body) { return this._http.request('POST', `/threads/${this._id}/posts`, { body }); }
  insights() { return this._http.request('GET', `/threads/${this._id}/insights`); }
  postInsights(postId) { return this._http.request('GET', `/threads/posts/${postId}/insights`, { query: { profileId: this._id } }); }
}

// ── Pages (free) ────────────────────────────────────────────────────────────────
class PageScope {
  constructor(http, pageId) { this._http = http; this._id = pageId; }
  posts(query) { return this._http.request('GET', `/pages/${this._id}/posts`, { query }); }
  createPost(body) { return this._http.request('POST', `/pages/${this._id}/posts`, { body }); }
  deletePost(postId) { return this._http.request('DELETE', `/pages/posts/${postId}`, { query: { pageId: this._id } }); }
  postComments(postId, query) { return this._http.request('GET', `/pages/posts/${postId}/comments`, { query: { pageId: this._id, ...query } }); }
  postInsights(postId) { return this._http.request('GET', `/pages/posts/${postId}/insights`, { query: { pageId: this._id } }); }
  replyComment(commentId, message) { return this._http.request('POST', `/pages/comments/${commentId}`, { query: { pageId: this._id }, body: { message } }); }
  deleteComment(commentId) { return this._http.request('DELETE', `/pages/comments/${commentId}`, { query: { pageId: this._id } }); }
  insights(query) { return this._http.request('GET', `/pages/${this._id}/insights`, { query }); }
  conversations(query) { return this._http.request('GET', `/pages/${this._id}/conversations`, { query }); }
  messages(conversationId, query) { return this._http.request('GET', `/pages/conversations/${conversationId}/messages`, { query: { pageId: this._id, ...query } }); }
  sendMessage(conversationId, message) { return this._http.request('POST', `/pages/conversations/${conversationId}/messages`, { query: { pageId: this._id }, body: { message } }); }
}

// ── Instagram (per IG account scope) ────────────────────────────────────────────
class InstagramScope {
  constructor(http, igId) { this._http = http; this._id = igId; }
  media(query) { return this._http.request('GET', `/instagram/${this._id}/media`, { query }); }
  /** Publish: { mediaType:"IMAGE"|"VIDEO"|"REELS"|"STORIES", imageUrl?, videoUrl?, caption? } */
  publish(body) { return this._http.request('POST', `/instagram/${this._id}/media`, { body }); }
  insights(query) { return this._http.request('GET', `/instagram/${this._id}/insights`, { query }); }
  mediaInsights(mediaId, mediaType = 'IMAGE') { return this._http.request('GET', `/instagram/media/${mediaId}/insights`, { query: { igId: this._id, mediaType } }); }
  comments(mediaId, query) { return this._http.request('GET', `/instagram/media/${mediaId}/comments`, { query: { igId: this._id, ...query } }); }
  comment(mediaId, message) { return this._http.request('POST', `/instagram/media/${mediaId}/comments`, { query: { igId: this._id }, body: { message } }); }
  replyComment(commentId, message) { return this._http.request('POST', `/instagram/comments/${commentId}`, { query: { igId: this._id }, body: { message } }); }
  hideComment(commentId, hidden) { return this._http.request('POST', `/instagram/comments/${commentId}`, { query: { igId: this._id }, body: { hidden } }); }
  deleteComment(commentId) { return this._http.request('DELETE', `/instagram/comments/${commentId}`, { query: { igId: this._id } }); }
  conversations(query) { return this._http.request('GET', `/instagram/${this._id}/conversations`, { query }); }
  messages(conversationId, query) { return this._http.request('GET', `/instagram/conversations/${conversationId}/messages`, { query: { igId: this._id, ...query } }); }
  sendMessage(recipientId, message) { return this._http.request('POST', `/instagram/conversations/${recipientId}/messages`, { query: { igId: this._id }, body: { recipientId, message } }); }
}

class AdFlow {
  constructor(config) {
    this._http = new HttpClient(config);
    this.clients = new Clients(this._http);
  }
  /** List the ad accounts onboarded across your clients (enabled for the API). */
  listAdAccounts() { return this._http.request('GET', '/ads/accounts'); }
  /** Scope ads ops to one ad account: account('act_123').campaigns(). */
  account(accountId) { return new AdAccountScope(this._http, accountId); }
  /** Scope Threads ops to one profile: profile('178…').publish({...}). */
  profile(profileId) { return new ThreadsScope(this._http, profileId); }
  /** Free Facebook Page ops: page('123').createPost({...}). */
  page(pageId) { return new PageScope(this._http, pageId); }
  /** Free Instagram ops: instagram('178…').publish({...}). */
  instagram(igId) { return new InstagramScope(this._http, igId); }
  /** Escape hatch for any /api/v1 endpoint. */
  request(method, path, opts) { return this._http.request(method, path, opts); }
}

module.exports = { AdFlow, AdFlowError };
