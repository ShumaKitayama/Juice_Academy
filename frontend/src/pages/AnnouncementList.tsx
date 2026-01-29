import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnnouncementCard from "../components/AnnouncementCard";
import Button from "../components/Button";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Announcement,
  getAllAnnouncements,
} from "../services/announcementService";

const AnnouncementList: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // お知らせが新着かどうかを判定（24時間以内に作成されたものを新着とする）
  const isNewAnnouncement = (createdAt: string) => {
    const announcementDate = new Date(createdAt);
    const now = new Date();
    const diffInHours =
      (now.getTime() - announcementDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await getAllAnnouncements();
        setAnnouncements(data);
        setLoading(false);
      } catch {
        setError("お知らせの取得に失敗しました");
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-dvh bg-gray-50 py-2 sm:py-4 px-2 sm:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-balance">
            お知らせ一覧
          </h1>
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="small"
            className="w-full sm:w-auto text-sm"
          >
            ダッシュボードへ戻る
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorAlert message={error} />
        ) : announcements.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">現在お知らせはありません</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-2">
                  <AnnouncementCard
                    announcement={announcement}
                    isNew={isNewAnnouncement(announcement.createdAt)} // 24時間以内のお知らせには「新着情報」バッジを表示
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementList;
