<?php
// @adflow/sdk — official PHP SDK for the AdFlow bridge.
// One SDK for Meta Marketing (Ads), Threads, and free Facebook Pages & Instagram
// through AdFlow's approved app. No Meta App Review on your side.
// Requires PHP >= 7.4 + ext-curl.

namespace AdFlow\Sdk;

class AdFlowError extends \Exception {
    public string $errorCode;
    public ?int $status;
    public function __construct(string $message, string $code = 'error', ?int $status = null) {
        parent::__construct($message);
        $this->errorCode = $code;
        $this->status = $status;
    }
}

class HttpClient {
    private string $apiKey;
    private string $base;
    private int $timeout;

    public function __construct(array $config) {
        if (empty($config['apiKey'])) throw new AdFlowError('apiKey is required', 'config');
        $this->apiKey = $config['apiKey'];
        $this->base = rtrim($config['baseUrl'] ?? 'https://adflowapps.com', '/') . '/api/v1';
        $this->timeout = $config['timeout'] ?? 20;
    }

    public function request(string $method, string $path, array $opts = []) {
        $url = $this->base . $path;
        if (!empty($opts['query'])) {
            $q = array_filter($opts['query'], fn($v) => $v !== null);
            if ($q) $url .= (strpos($path, '?') !== false ? '&' : '?') . http_build_query($q);
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $this->apiKey, 'Content-Type: application/json'],
        ]);
        if (isset($opts['body'])) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($opts['body']));
        $raw = curl_exec($ch);
        if ($raw === false) { $err = curl_error($ch); curl_close($ch); throw new AdFlowError($err ?: 'network error', 'network'); }
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $json = json_decode($raw, true);
        if ($status >= 400 || (is_array($json) && ($json['ok'] ?? null) === false)) {
            $e = $json['error'] ?? [];
            throw new AdFlowError($e['message'] ?? "HTTP $status", $e['code'] ?? 'error', $status);
        }
        return is_array($json) ? ($json['data'] ?? null) : null;
    }
}

class Clients {
    public function __construct(private HttpClient $http) {}
    public function list() { return $this->http->request('GET', '/clients'); }
    public function get(string $id) { return $this->http->request('GET', "/clients/$id"); }
    public function create(array $body) { return $this->http->request('POST', '/clients', ['body' => $body]); }
    public function delete(string $id) { return $this->http->request('DELETE', "/clients/$id"); }
}

class AdAccountScope {
    public function __construct(private HttpClient $http, private string $id) {}
    public function campaigns(array $query = []) { return $this->http->request('GET', "/ads/{$this->id}/campaigns", ['query' => $query]); }
    public function createCampaign(array $body) { return $this->http->request('POST', "/ads/{$this->id}/campaigns", ['body' => $body]); }
    public function updateCampaign(string $cid, array $body) { return $this->http->request('POST', "/ads/campaigns/$cid", ['query' => ['accountId' => $this->id], 'body' => $body]); }
    public function deleteCampaign(string $cid) { return $this->http->request('DELETE', "/ads/campaigns/$cid", ['query' => ['accountId' => $this->id]]); }
    public function adsets(string $campaignId, array $query = []) { return $this->http->request('GET', "/ads/{$this->id}/adsets", ['query' => array_merge(['campaignId' => $campaignId], $query)]); }
    public function createAdSet(array $body) { return $this->http->request('POST', "/ads/{$this->id}/adsets", ['body' => $body]); }
    public function updateAdSet(string $aid, array $body) { return $this->http->request('POST', "/ads/adsets/$aid", ['query' => ['accountId' => $this->id], 'body' => $body]); }
    public function ads(array $query = []) { return $this->http->request('GET', "/ads/{$this->id}/ads", ['query' => $query]); }
    public function createAd(array $body) { return $this->http->request('POST', "/ads/{$this->id}/ads", ['body' => $body]); }
    public function updateAd(string $aid, array $body) { return $this->http->request('POST', "/ads/ads/$aid", ['query' => ['accountId' => $this->id], 'body' => $body]); }
    public function insights(array $query = []) { return $this->http->request('GET', "/ads/{$this->id}/insights", ['query' => $query]); }
    public function audiences() { return $this->http->request('GET', "/ads/{$this->id}/audiences"); }
    public function createAudience(array $body) { return $this->http->request('POST', "/ads/{$this->id}/audiences", ['body' => $body]); }
    public function pixels() { return $this->http->request('GET', "/ads/{$this->id}/pixels"); }
    public function pixelStats(string $pid) { return $this->http->request('GET', "/ads/pixels/$pid/stats", ['query' => ['accountId' => $this->id]]); }
}

class ThreadsScope {
    public function __construct(private HttpClient $http, private string $id) {}
    public function profile() { return $this->http->request('GET', "/threads/{$this->id}"); }
    public function posts(array $query = []) { return $this->http->request('GET', "/threads/{$this->id}/posts", ['query' => $query]); }
    public function publish(array $body) { return $this->http->request('POST', "/threads/{$this->id}/posts", ['body' => $body]); }
    public function insights() { return $this->http->request('GET', "/threads/{$this->id}/insights"); }
    public function postInsights(string $postId) { return $this->http->request('GET', "/threads/posts/$postId/insights", ['query' => ['profileId' => $this->id]]); }
    public function replies(string $postId, array $query = []) { return $this->http->request('GET', "/threads/posts/$postId/replies", ['query' => array_merge(['profileId' => $this->id], $query)]); }
    public function reply(string $postId, string $text) { return $this->http->request('POST', "/threads/posts/$postId/replies", ['query' => ['profileId' => $this->id], 'body' => ['text' => $text]]); }
    public function hideReply(string $replyId, bool $hide) { return $this->http->request('POST', "/threads/replies/$replyId", ['query' => ['profileId' => $this->id], 'body' => ['hide' => $hide]]); }
    public function deletePost(string $postId) { return $this->http->request('DELETE', "/threads/posts/$postId", ['query' => ['profileId' => $this->id]]); }
    public function mentions(array $query = []) { return $this->http->request('GET', "/threads/{$this->id}/mentions", ['query' => $query]); }
}

class PageScope {
    public function __construct(private HttpClient $http, private string $id) {}
    public function posts(array $query = []) { return $this->http->request('GET', "/pages/{$this->id}/posts", ['query' => $query]); }
    public function createPost(array $body) { return $this->http->request('POST', "/pages/{$this->id}/posts", ['body' => $body]); }
    public function deletePost(string $pid) { return $this->http->request('DELETE', "/pages/posts/$pid", ['query' => ['pageId' => $this->id]]); }
    public function postComments(string $pid, array $query = []) { return $this->http->request('GET', "/pages/posts/$pid/comments", ['query' => array_merge(['pageId' => $this->id], $query)]); }
    public function replyComment(string $cid, string $message) { return $this->http->request('POST', "/pages/comments/$cid", ['query' => ['pageId' => $this->id], 'body' => ['message' => $message]]); }
    public function insights(array $query = []) { return $this->http->request('GET', "/pages/{$this->id}/insights", ['query' => $query]); }
    public function conversations(array $query = []) { return $this->http->request('GET', "/pages/{$this->id}/conversations", ['query' => $query]); }
    public function sendMessage(string $conversationId, string $message) { return $this->http->request('POST', "/pages/conversations/$conversationId/messages", ['query' => ['pageId' => $this->id], 'body' => ['message' => $message]]); }
}

class InstagramScope {
    public function __construct(private HttpClient $http, private string $id) {}
    public function media(array $query = []) { return $this->http->request('GET', "/instagram/{$this->id}/media", ['query' => $query]); }
    public function publish(array $body) { return $this->http->request('POST', "/instagram/{$this->id}/media", ['body' => $body]); }
    public function publishCarousel(array $children, ?string $caption = null) { return $this->http->request('POST', "/instagram/{$this->id}/media", ['body' => ['mediaType' => 'CAROUSEL', 'children' => $children, 'caption' => $caption]]); }
    public function stories() { return $this->http->request('GET', "/instagram/{$this->id}/stories"); }
    public function insights(array $query = []) { return $this->http->request('GET', "/instagram/{$this->id}/insights", ['query' => $query]); }
    public function mediaInsights(string $mediaId, string $mediaType = 'IMAGE') { return $this->http->request('GET', "/instagram/media/$mediaId/insights", ['query' => ['igId' => $this->id, 'mediaType' => $mediaType]]); }
    public function comments(string $mediaId, array $query = []) { return $this->http->request('GET', "/instagram/media/$mediaId/comments", ['query' => array_merge(['igId' => $this->id], $query)]); }
    public function comment(string $mediaId, string $message) { return $this->http->request('POST', "/instagram/media/$mediaId/comments", ['query' => ['igId' => $this->id], 'body' => ['message' => $message]]); }
    public function replyComment(string $commentId, string $message) { return $this->http->request('POST', "/instagram/comments/$commentId", ['query' => ['igId' => $this->id], 'body' => ['message' => $message]]); }
    public function hideComment(string $commentId, bool $hidden) { return $this->http->request('POST', "/instagram/comments/$commentId", ['query' => ['igId' => $this->id], 'body' => ['hidden' => $hidden]]); }
    public function deleteComment(string $commentId) { return $this->http->request('DELETE', "/instagram/comments/$commentId", ['query' => ['igId' => $this->id]]); }
    public function conversations(array $query = []) { return $this->http->request('GET', "/instagram/{$this->id}/conversations", ['query' => $query]); }
    public function messages(string $conversationId, array $query = []) { return $this->http->request('GET', "/instagram/conversations/$conversationId/messages", ['query' => array_merge(['igId' => $this->id], $query)]); }
    public function sendMessage(string $recipientId, string $message) { return $this->http->request('POST', "/instagram/conversations/$recipientId/messages", ['query' => ['igId' => $this->id], 'body' => ['recipientId' => $recipientId, 'message' => $message]]); }
}

class AdFlow {
    private HttpClient $http;
    public Clients $clients;
    public function __construct(array $config) {
        $this->http = new HttpClient($config);
        $this->clients = new Clients($this->http);
    }
    public function listAdAccounts() { return $this->http->request('GET', '/ads/accounts'); }
    public function account(string $accountId): AdAccountScope { return new AdAccountScope($this->http, $accountId); }
    public function profile(string $profileId): ThreadsScope { return new ThreadsScope($this->http, $profileId); }
    public function page(string $pageId): PageScope { return new PageScope($this->http, $pageId); }
    public function instagram(string $igId): InstagramScope { return new InstagramScope($this->http, $igId); }
    public function request(string $method, string $path, array $opts = []) { return $this->http->request($method, $path, $opts); }
}
