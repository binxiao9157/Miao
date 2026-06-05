import { requestJson } from "./httpClient";

export const ADMIN_TOKEN = "miao_admin_8888";
export const ADMIN_UNLOCK_CODES = new Set([ADMIN_TOKEN, "888888"]);

export interface AdminUser {
  username: string;
  nickname: string;
  avatar: string;
  phone: string;
  catsCount: number;
  diariesCount: number;
  points: number;
  createdAt: number;
}

export interface AdminFeedback {
  id: string;
  userId: string;
  type: string;
  content?: string;
  answers?: Record<string, any>;
  createdAt: number;
  userNickname: string;
  userAvatar: string;
}

export interface AdminStats {
  summary: {
    totalUsers: number;
    totalCats: number;
    totalDiaries: number;
    totalFeedbacks: number;
    totalPoints: number;
  };
  users: AdminUser[];
  feedbacks: AdminFeedback[];
}

type AdminStatsResponse = AdminStats & {
  success?: boolean;
};

export type AdminPointAdjustment = {
  amount: number;
  type: "earn" | "spend";
  reason: string;
};

function adminHeaders() {
  return {
    "X-Admin-Token": ADMIN_TOKEN,
  };
}

export function isAdminUnlockCode(value: string) {
  return ADMIN_UNLOCK_CODES.has(value.trim());
}

export const adminService = {
  async fetchStats(): Promise<AdminStats> {
    const data = await requestJson<AdminStatsResponse>("/api/v1/admin/stats", {
      headers: adminHeaders(),
    });
    return {
      summary: data.summary,
      users: data.users || [],
      feedbacks: data.feedbacks || [],
    };
  },

  adjustUserPoints(username: string, payload: AdminPointAdjustment) {
    return requestJson<{ success: boolean; total: number; transaction: unknown }>(
      `/api/v1/admin/users/${encodeURIComponent(username)}/points`,
      {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      }
    );
  },

  deleteUser(username: string) {
    return requestJson<{ success: boolean }>(`/api/v1/admin/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
  },

  deleteFeedback(id: string) {
    return requestJson<{ success: boolean }>(`/api/v1/admin/feedback/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
  },
};
