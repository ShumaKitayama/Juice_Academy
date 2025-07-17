import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnnouncementCard from '../components/AnnouncementCard';
import { Announcement, getLatestAnnouncements } from '../services/announcementService';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // ユーザーが管理者かどうかをチェック（roleが'admin'の場合、または明示的にisAdminがtrueの場合）
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

  useEffect(() => {
    // デバッグログ
    console.log('現在のユーザー情報:', user);
    
    const fetchAnnouncements = async () => {
      try {
        const data = await getLatestAnnouncements(3); // 最新3件を取得
        setAnnouncements(data);
        setLoading(false);
      } catch (err) {
        console.error('お知らせの取得に失敗しました', err);
        setError('お知らせの取得に失敗しました');
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <button
            onClick={logout}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            ログアウト
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* お知らせセクション */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  お知らせ
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  最新情報を確認してください
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link
                    to="/admin/announcements"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    お知らせ管理
                  </Link>
                )}
                <Link
                  to="/announcements"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  すべて見る →
                </Link>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {loading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <p className="text-red-500 text-center">{error}</p>
              ) : announcements.length === 0 ? (
                <p className="text-gray-500 text-center">現在お知らせはありません</p>
              ) : (
                <div>
                  {announcements.map((announcement, index) => (
                    <AnnouncementCard 
                      key={announcement.id} 
                      announcement={announcement} 
                      isNew={index === 0} // 最新のお知らせには「新着情報」バッジを表示
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                ユーザー情報
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                アカウント詳細と登録情報
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">氏名</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user?.nameKana}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user?.email}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">学籍番号</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user?.studentId}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">ユーザータイプ</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user?.role === 'admin' ? '管理者' : user?.role === 'student' ? '学生' : '教師'}
                  </dd>
                </div>
                {isAdmin && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">管理者権限</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      有効
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* 管理者向けカード */}
            {isAdmin && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    管理者機能
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>
                      お知らせの管理と作成
                    </p>
                  </div>
                  <div className="mt-5">
                    <Link
                      to="/admin/announcements"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      お知らせを管理
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  決済情報
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>
                    サブスクリプションと支払い方法の管理
                  </p>
                </div>
                <div className="mt-5">
                  <Link
                    to="/payment-setup"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    決済情報を管理
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  サブスクリプション
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>
                    現在のプランと利用状況
                  </p>
                </div>
                <div className="mt-5">
                  <Link
                    to="/subscription"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    プランを変更
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  支払い履歴
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>
                    過去の支払い記録と詳細
                  </p>
                </div>
                <div className="mt-5">
                  <Link
                    to="/payment-history"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    履歴を確認
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 