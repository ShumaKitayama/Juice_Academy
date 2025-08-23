import { api } from "./api";

// お知らせの型定義
export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// バックエンドのレスポンス形式に合わせて修正
interface AnnouncementsResponse {
  announcements: Announcement[];
  count: number;
}

// APIのベースURLは api.ts で管理されています

// すべてのお知らせを取得
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const response = await api.get<AnnouncementsResponse>("/announcements");
    console.log("お知らせデータのレスポンス:", response.data);

    // レスポンスから announcements プロパティを取得
    if (response.data && response.data.announcements) {
      return response.data.announcements;
    } else if (Array.isArray(response.data)) {
      // 古い形式の場合（直接配列）
      return response.data;
    }

    console.error("予期しないレスポンス形式:", response.data);
    return [];
  } catch (error) {
    console.error("お知らせの取得中にエラーが発生しました:", error);
    throw error;
  }
};

// 最新の指定数のお知らせを取得
export const getLatestAnnouncements = async (
  limit: number
): Promise<Announcement[]> => {
  try {
    const response = await api.get<AnnouncementsResponse>(
      `/announcements?limit=${limit}`
    );

    // レスポンスから announcements プロパティを取得
    if (response.data && response.data.announcements) {
      return response.data.announcements;
    } else if (Array.isArray(response.data)) {
      // 古い形式の場合（直接配列）
      return response.data;
    }

    console.error("予期しないレスポンス形式:", response.data);
    return [];
  } catch (error) {
    console.error(
      `最新の${limit}件のお知らせの取得中にエラーが発生しました:`,
      error
    );
    throw error;
  }
};

// 特定のお知らせを取得
export const getAnnouncementById = async (
  id: string
): Promise<Announcement> => {
  try {
    const response = await api.get<Announcement>(`/announcements/${id}`);
    return response.data;
  } catch (error) {
    console.error(`ID ${id} のお知らせの取得中にエラーが発生しました:`, error);
    throw error;
  }
};

// 新しいお知らせを作成（管理者のみ）- 通常のAPI方式
export const createAnnouncement = async (
  announcement: Omit<Announcement, "id" | "createdAt" | "updatedAt">
): Promise<Announcement> => {
  try {
    const response = await api.post<Announcement>(
      "/admin/announcements",
      announcement
    );
    return response.data;
  } catch (error) {
    console.error("お知らせの作成中にエラーが発生しました:", error);
    throw error;
  }
};

// お知らせを更新（管理者のみ）
export const updateAnnouncement = async (
  id: string,
  announcement: Partial<Announcement>
): Promise<Announcement> => {
  try {
    const response = await api.put<Announcement>(
      `/admin/announcements/${id}`,
      announcement
    );
    return response.data;
  } catch (error) {
    console.error(`ID ${id} のお知らせの更新中にエラーが発生しました:`, error);
    throw error;
  }
};

// お知らせを削除（管理者のみ）
export const deleteAnnouncement = async (id: string): Promise<void> => {
  try {
    await api.delete(`/admin/announcements/${id}`);
  } catch (error) {
    console.error(`ID ${id} のお知らせの削除中にエラーが発生しました:`, error);
    throw error;
  }
};
