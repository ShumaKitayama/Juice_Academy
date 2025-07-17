import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Announcement, getAllAnnouncements } from '../services/announcementService';
import AnnouncementCard from '../components/AnnouncementCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Button from '../components/Button';

const AdminAnnouncementList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 管理者権限チェック
    if (!user || user.role !== 'admin') {
      console.error('管理者権限が必要です。現在のユーザー:', user);
      navigate('/');
      return;
    }

    console.log('管理者としてログイン中:', user);
    
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
  }, [user, navigate]);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleCreateNew = () => {
    navigate('/admin/announcements/create');
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/announcements/edit/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">お知らせ管理</h1>
          <div className="flex space-x-3">
            <Button
              onClick={handleCreateNew}
              variant="primary"
              size="small"
            >
              作成する
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="small"
            >
              ダッシュボードへ戻る
            </Button>
          </div>
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
            <Button
              onClick={handleCreateNew}
              variant="primary"
              size="medium"
              className="mt-4"
            >
              新しいお知らせを作成
            </Button>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement, index) => (
                <div key={announcement.id} className="p-2">
                  <AnnouncementCard
                    announcement={announcement}
                    isNew={index === 0} // 最新のお知らせには「新着情報」バッジを表示
                    showEditButton={true}
                    onEditClick={handleEdit}
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

export default AdminAnnouncementList; 