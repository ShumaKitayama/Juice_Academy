import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Announcement,
  getAnnouncementById,
} from "../services/announcementService";

const AnnouncementDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!id) {
        setError("お知らせIDが不正です");
        setLoading(false);
        return;
      }

      try {
        const data = await getAnnouncementById(id);
        setAnnouncement(data);
        setLoading(false);
      } catch {
        setError("お知らせの取得に失敗しました");
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id]);

  const handleGoBack = () => {
    navigate(-1); // 前のページに戻る
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <ErrorAlert message={error || "お知らせが見つかりませんでした"} />
          <div className="mt-6 text-center">
            <Button onClick={handleGoBack} variant="outline" size="medium">
              戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {announcement.title}
              </h1>
              <Button onClick={handleGoBack} variant="outline" size="small">
                戻る
              </Button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              投稿日: {formatDate(announcement.createdAt)}
              {announcement.createdAt !== announcement.updatedAt && (
                <span className="ml-2">
                  (更新日: {formatDate(announcement.updatedAt)})
                </span>
              )}
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="prose max-w-none">
              {/* コンテンツを段落に分けて表示 */}
              {announcement.content.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;
