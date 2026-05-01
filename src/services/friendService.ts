import { FriendDiaryEntry, FriendInfo, storage } from "./storage";

export interface FriendInvite {
  code: string;
  ownerId: string;
  catId?: string;
  catName?: string;
  catAvatar?: string;
  createdAt: number;
  expiresAt: number;
  inviter?: {
    username: string;
    nickname: string;
    avatar: string;
  };
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = storage.getToken();
  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "pwa",
      "X-Client-Version": "1.0.0",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.message || data.error || `HTTP ${resp.status}`);
  }
  return data as T;
}

function extractInviteCode(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.searchParams.get("invite") || url.searchParams.get("code") || "";
  } catch {
    const match = value.match(/(?:invite|code)=([A-Za-z0-9_-]+)/);
    if (match?.[1]) return match[1];
    if (/^[A-Za-z0-9_-]{8,}$/.test(value)) return value;
    return "";
  }
}

export const friendService = {
  extractInviteCode,

  buildInvitePayload(code: string) {
    return `${window.location.origin}/scan-friend?invite=${encodeURIComponent(code)}`;
  },

  async createInvite(cat: { id?: string; name?: string; avatar?: string }): Promise<FriendInvite> {
    const data = await request<{ invite: FriendInvite }>("/api/v1/friend-invites", {
      method: "POST",
      body: JSON.stringify({
        catId: cat.id || "",
        catName: cat.name || "",
        catAvatar: cat.avatar || "",
      }),
    });
    return data.invite;
  },

  async getInvite(code: string): Promise<FriendInvite> {
    const data = await request<{ invite: FriendInvite }>(`/api/v1/friend-invites/${encodeURIComponent(code)}`);
    return data.invite;
  },

  async acceptInvite(code: string): Promise<FriendInfo> {
    const data = await request<{ friend: FriendInfo }>("/api/v1/friends/accept", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (data.friend) storage.addFriend(data.friend);
    return data.friend;
  },

  async syncFriends(): Promise<FriendInfo[]> {
    const friends = await request<FriendInfo[]>("/api/v1/friends");
    storage.saveFriends(friends);
    return friends;
  },

  async syncFriendDiaries(): Promise<FriendDiaryEntry[]> {
    const diaries = await request<FriendDiaryEntry[]>("/api/v1/friends/diaries");
    storage.saveFriendDiaries(diaries);
    return diaries;
  },
};

export default friendService;
