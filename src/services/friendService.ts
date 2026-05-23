import { FriendDiaryEntry, FriendInfo, storage } from "./storage";
import { requestJson } from "./httpClient";

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
    return `miao://friend?invite=${encodeURIComponent(code)}`;
  },

  async createInvite(cat: { id?: string; name?: string; avatar?: string }): Promise<FriendInvite> {
    const data = await requestJson<{ invite: FriendInvite }>("/api/v1/friend-invites", {
      method: "POST",
      body: JSON.stringify({
        catId: cat.id || "",
        catName: cat.name || "",
        catAvatar: cat.avatar || "",
      }),
    }, { clientVersion: "1.0.0" });
    return data.invite;
  },

  async getInvite(code: string): Promise<FriendInvite> {
    const data = await requestJson<{ invite: FriendInvite }>(
      `/api/v1/friend-invites/${encodeURIComponent(code)}`,
      {},
      { clientVersion: "1.0.0" }
    );
    return data.invite;
  },

  async acceptInvite(code: string): Promise<FriendInfo> {
    const data = await requestJson<{ friend: FriendInfo }>("/api/v1/friends/accept", {
      method: "POST",
      body: JSON.stringify({ code }),
    }, { clientVersion: "1.0.0" });
    if (data.friend) storage.addFriend(data.friend);
    return data.friend;
  },

  async syncFriends(): Promise<FriendInfo[]> {
    const friends = await requestJson<FriendInfo[]>("/api/v1/friends", {}, { clientVersion: "1.0.0" });
    storage.saveFriends(friends);
    return friends;
  },

  async syncFriendDiaries(): Promise<FriendDiaryEntry[]> {
    const diaries = await requestJson<FriendDiaryEntry[]>("/api/v1/friends/diaries", {}, { clientVersion: "1.0.0" });
    storage.saveFriendDiaries(diaries);
    return diaries;
  },
};

export default friendService;
