// Type definitions for @adflow/sdk
export interface AdFlowConfig { apiKey: string; baseUrl?: string; timeout?: number; }

export class AdFlowError extends Error {
  code: string;
  status?: number;
  retryAfterMs?: number;
}

export interface ClientResource { id: string; platform: 'ads' | 'threads' | 'pages' | 'instagram'; metaId: string; name: string; apiEnabled: boolean; }
export interface PartnerClient { id: string; displayName: string; externalRef: string | null; status: string; createdAt: string; resources: ClientResource[]; }

export class Clients {
  list(): Promise<PartnerClient[]>;
  get(id: string): Promise<PartnerClient>;
  create(input: { displayName: string; externalRef?: string }): Promise<{ id: string; displayName: string; onboardUrl: string }>;
  delete(id: string): Promise<{ id: string; deleted: boolean }>;
}

export class AdAccountScope {
  campaigns(query?: { date_preset?: string; status?: 'ACTIVE' | 'PAUSED' | 'ALL' }): Promise<any>;
  createCampaign(body: { name: string; objective: string; status?: 'ACTIVE' | 'PAUSED' }): Promise<{ id: string }>;
  updateCampaign(id: string, body: { status: 'ACTIVE' | 'PAUSED' }): Promise<any>;
  deleteCampaign(id: string): Promise<any>;
  adsets(campaignId: string, query?: Record<string, unknown>): Promise<any>;
  createAdSet(body: Record<string, unknown>): Promise<any>;
  updateAdSet(id: string, body: { status?: 'ACTIVE' | 'PAUSED'; dailyBudget?: number }): Promise<any>;
  ads(query?: { adSetId?: string; date_preset?: string }): Promise<any>;
  createAd(body: Record<string, unknown>): Promise<any>;
  updateAd(id: string, body: { status: 'ACTIVE' | 'PAUSED' }): Promise<any>;
  insights(query?: { date_preset?: string; breakdown?: string; time_increment?: string }): Promise<any>;
  audiences(): Promise<any[]>;
  createAudience(body: Record<string, unknown>): Promise<any>;
  pixels(): Promise<any[]>;
  pixelStats(pixelId: string): Promise<any>;
}

export interface ThreadsPublish {
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'POLL';
  text?: string;
  mediaUrls?: Array<{ url: string; type: 'image' | 'video' }> | string;
  pollOptions?: string[] | string;
  pollDuration?: number;
  replyToId?: string;
}
export class ThreadsScope {
  profile(): Promise<any>;
  posts(query?: { limit?: number }): Promise<any[]>;
  publish(body: ThreadsPublish): Promise<{ threadsPostId: string; threadsUrl: string }>;
  insights(): Promise<any>;
  postInsights(postId: string): Promise<any>;
}

export class PageScope {
  posts(query?: { limit?: number }): Promise<any[]>;
  createPost(body: { message: string; link?: string; scheduledPublishTime?: number }): Promise<any>;
  deletePost(postId: string): Promise<any>;
  postComments(postId: string, query?: { limit?: number }): Promise<any[]>;
  postInsights(postId: string): Promise<any>;
  replyComment(commentId: string, message: string): Promise<any>;
  deleteComment(commentId: string): Promise<any>;
  insights(query?: { period?: 'day' | 'week' | 'days_28' }): Promise<any>;
  conversations(query?: { limit?: number }): Promise<any[]>;
  messages(conversationId: string, query?: { limit?: number }): Promise<any[]>;
  sendMessage(conversationId: string, message: string): Promise<any>;
}

export class AdFlow {
  constructor(config: AdFlowConfig);
  clients: Clients;
  listAdAccounts(): Promise<any[]>;
  account(accountId: string): AdAccountScope;
  profile(profileId: string): ThreadsScope;
  page(pageId: string): PageScope;
  request<T = unknown>(method: string, path: string, opts?: { query?: Record<string, unknown>; body?: unknown }): Promise<T>;
}
