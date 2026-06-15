"""adflow-sdk — official Python SDK for the AdFlow bridge.

One SDK for Meta Marketing (Ads), Threads, and free Facebook Pages & Instagram,
through AdFlow's Meta-App-Review-approved app. No App Review on your side.
Zero dependencies (stdlib only).
"""
import json
import urllib.request
import urllib.parse
import urllib.error

__version__ = "0.1.0"


class AdFlowError(Exception):
    def __init__(self, message, code="error", status=None):
        super().__init__(message)
        self.code = code
        self.status = status


class _Http:
    def __init__(self, api_key, base_url="https://adflowapps.com", timeout=20):
        if not api_key:
            raise AdFlowError("api_key is required", "config")
        self._key = api_key
        self._base = base_url.rstrip("/") + "/api/v1"
        self._timeout = timeout

    def request(self, method, path, query=None, body=None):
        url = self._base + path
        if query:
            q = {k: v for k, v in query.items() if v is not None}
            if q:
                url += ("&" if "?" in path else "?") + urllib.parse.urlencode(q)
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", "Bearer " + self._key)
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                payload = json.loads(resp.read().decode() or "null")
        except urllib.error.HTTPError as e:
            try:
                payload = json.loads(e.read().decode() or "null")
            except Exception:
                payload = None
            err = (payload or {}).get("error", {}) if isinstance(payload, dict) else {}
            raise AdFlowError(err.get("message", f"HTTP {e.code}"), err.get("code", "error"), e.code)
        except urllib.error.URLError as e:
            raise AdFlowError(str(e.reason), "network")
        if isinstance(payload, dict) and payload.get("ok") is False:
            err = payload.get("error", {})
            raise AdFlowError(err.get("message", "error"), err.get("code", "error"))
        return payload.get("data") if isinstance(payload, dict) else None


class Clients:
    def __init__(self, http): self._http = http
    def list(self): return self._http.request("GET", "/clients")
    def get(self, cid): return self._http.request("GET", f"/clients/{cid}")
    def create(self, display_name, external_ref=None):
        return self._http.request("POST", "/clients", body={"displayName": display_name, "externalRef": external_ref})
    def delete(self, cid): return self._http.request("DELETE", f"/clients/{cid}")


class AdAccountScope:
    def __init__(self, http, account_id): self._http = http; self._id = account_id
    def campaigns(self, **query): return self._http.request("GET", f"/ads/{self._id}/campaigns", query=query)
    def create_campaign(self, **body): return self._http.request("POST", f"/ads/{self._id}/campaigns", body=body)
    def update_campaign(self, cid, **body): return self._http.request("POST", f"/ads/campaigns/{cid}", query={"accountId": self._id}, body=body)
    def delete_campaign(self, cid): return self._http.request("DELETE", f"/ads/campaigns/{cid}", query={"accountId": self._id})
    def adsets(self, campaign_id, **query): return self._http.request("GET", f"/ads/{self._id}/adsets", query={"campaignId": campaign_id, **query})
    def create_adset(self, **body): return self._http.request("POST", f"/ads/{self._id}/adsets", body=body)
    def update_adset(self, aid, **body): return self._http.request("POST", f"/ads/adsets/{aid}", query={"accountId": self._id}, body=body)
    def ads(self, **query): return self._http.request("GET", f"/ads/{self._id}/ads", query=query)
    def create_ad(self, **body): return self._http.request("POST", f"/ads/{self._id}/ads", body=body)
    def update_ad(self, aid, **body): return self._http.request("POST", f"/ads/ads/{aid}", query={"accountId": self._id}, body=body)
    def insights(self, **query): return self._http.request("GET", f"/ads/{self._id}/insights", query=query)
    def audiences(self): return self._http.request("GET", f"/ads/{self._id}/audiences")
    def create_audience(self, **body): return self._http.request("POST", f"/ads/{self._id}/audiences", body=body)
    def pixels(self): return self._http.request("GET", f"/ads/{self._id}/pixels")
    def pixel_stats(self, pid): return self._http.request("GET", f"/ads/pixels/{pid}/stats", query={"accountId": self._id})


class ThreadsScope:
    def __init__(self, http, profile_id): self._http = http; self._id = profile_id
    def profile(self): return self._http.request("GET", f"/threads/{self._id}")
    def posts(self, **query): return self._http.request("GET", f"/threads/{self._id}/posts", query=query)
    def publish(self, **body): return self._http.request("POST", f"/threads/{self._id}/posts", body=body)
    def insights(self): return self._http.request("GET", f"/threads/{self._id}/insights")
    def post_insights(self, post_id): return self._http.request("GET", f"/threads/posts/{post_id}/insights", query={"profileId": self._id})
    def replies(self, post_id, **query): return self._http.request("GET", f"/threads/posts/{post_id}/replies", query={"profileId": self._id, **query})
    def reply(self, post_id, text): return self._http.request("POST", f"/threads/posts/{post_id}/replies", query={"profileId": self._id}, body={"text": text})
    def hide_reply(self, reply_id, hide): return self._http.request("POST", f"/threads/replies/{reply_id}", query={"profileId": self._id}, body={"hide": hide})
    def delete_post(self, post_id): return self._http.request("DELETE", f"/threads/posts/{post_id}", query={"profileId": self._id})
    def mentions(self, **query): return self._http.request("GET", f"/threads/{self._id}/mentions", query=query)


class PageScope:
    def __init__(self, http, page_id): self._http = http; self._id = page_id
    def posts(self, **query): return self._http.request("GET", f"/pages/{self._id}/posts", query=query)
    def create_post(self, **body): return self._http.request("POST", f"/pages/{self._id}/posts", body=body)
    def delete_post(self, pid): return self._http.request("DELETE", f"/pages/posts/{pid}", query={"pageId": self._id})
    def insights(self, **query): return self._http.request("GET", f"/pages/{self._id}/insights", query=query)
    def conversations(self, **query): return self._http.request("GET", f"/pages/{self._id}/conversations", query=query)
    def send_message(self, conversation_id, message):
        return self._http.request("POST", f"/pages/conversations/{conversation_id}/messages", query={"pageId": self._id}, body={"message": message})


class InstagramScope:
    def __init__(self, http, ig_id): self._http = http; self._id = ig_id
    def media(self, **query): return self._http.request("GET", f"/instagram/{self._id}/media", query=query)
    def publish(self, **body): return self._http.request("POST", f"/instagram/{self._id}/media", body=body)
    def insights(self, **query): return self._http.request("GET", f"/instagram/{self._id}/insights", query=query)
    def media_insights(self, media_id, media_type="IMAGE"): return self._http.request("GET", f"/instagram/media/{media_id}/insights", query={"igId": self._id, "mediaType": media_type})
    def comments(self, media_id, **query): return self._http.request("GET", f"/instagram/media/{media_id}/comments", query={"igId": self._id, **query})
    def comment(self, media_id, message): return self._http.request("POST", f"/instagram/media/{media_id}/comments", query={"igId": self._id}, body={"message": message})
    def reply_comment(self, comment_id, message): return self._http.request("POST", f"/instagram/comments/{comment_id}", query={"igId": self._id}, body={"message": message})
    def hide_comment(self, comment_id, hidden): return self._http.request("POST", f"/instagram/comments/{comment_id}", query={"igId": self._id}, body={"hidden": hidden})
    def delete_comment(self, comment_id): return self._http.request("DELETE", f"/instagram/comments/{comment_id}", query={"igId": self._id})
    def conversations(self, **query): return self._http.request("GET", f"/instagram/{self._id}/conversations", query=query)
    def messages(self, conversation_id, **query): return self._http.request("GET", f"/instagram/conversations/{conversation_id}/messages", query={"igId": self._id, **query})
    def send_message(self, recipient_id, message): return self._http.request("POST", f"/instagram/conversations/{recipient_id}/messages", query={"igId": self._id}, body={"recipientId": recipient_id, "message": message})


class AdFlow:
    def __init__(self, api_key, base_url="https://adflowapps.com", timeout=20):
        self._http = _Http(api_key, base_url, timeout)
        self.clients = Clients(self._http)
    def list_ad_accounts(self): return self._http.request("GET", "/ads/accounts")
    def account(self, account_id): return AdAccountScope(self._http, account_id)
    def profile(self, profile_id): return ThreadsScope(self._http, profile_id)
    def page(self, page_id): return PageScope(self._http, page_id)
    def instagram(self, ig_id): return InstagramScope(self._http, ig_id)
    def request(self, method, path, query=None, body=None): return self._http.request(method, path, query, body)
