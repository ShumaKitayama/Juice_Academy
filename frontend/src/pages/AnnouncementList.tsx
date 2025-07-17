import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Announcement, getAllAnnouncements } from '../services/announcementService';
import AnnouncementCard from '../components/AnnouncementCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Button from '../components/Button';

const AnnouncementList: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await getAllAnnouncements();
        setAnnouncements(data);
        setLoading(false);
      } catch (err) {
        console.error('お知らせの取得に失敗しました', err);
        setError('お知らせの取得に失敗しました');
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">お知らせ一覧</h1>
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="small"
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
              {announcements.map((announcement, index) => (
                <div key={announcement.id} className="p-2">
                  <AnnouncementCard
                    announcement={announcement}
                    isNew={index === 0} // 最新のお知らせには「新着情報」バッジを表示
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