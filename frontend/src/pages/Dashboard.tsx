import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnnouncementCard from "../components/AnnouncementCard";
import Card from "../components/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import {
  Announcement,
  getLatestAnnouncements,
} from "../services/announcementService";
import { paymentAPI } from "../services/api";
import Loading from "./Loading";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(
    sessionStorage.getItem("isLoading") === "true"
  );
  const [hasActiveSubscription, setHasActiveSubscription] =
    useState<boolean>(false);
  const [checkingSubscription, setCheckingSubscription] =
    useState<boolean>(true);

  // ユーザーが管理者かどうかをチェック
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;

  const navigate = useNavigate();

  // 管理者メニューのナビゲーションハンドラー
  const handleAdminNavigate = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
        sessionStorage.removeItem("isLoading");
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // お知らせが新着かどうかを判定（24時間以内に作成されたものを新着とする）
  const isNewAnnouncement = (createdAt: string) => {
    const announcementDate = new Date(createdAt);
    const now = new Date();
    const diffInHours =
      (now.getTime() - announcementDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  // サブスクリプション状態を確認
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const response = await paymentAPI.getSubscriptionStatus();
        setHasActiveSubscription(response.data.hasActiveSubscription || false);
      } catch {
        // エラー時はサブスクリプションなしとして扱う
        setHasActiveSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await getLatestAnnouncements(5);
        setAnnouncements(data);
        setLoading(false);
      } catch {
        setError("お知らせの取得に失敗しました");
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // ローディング画面を表示
  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* ヘッダーセクション */}
        <div className="mb-4 sm:mb-8">
          <div className="text-center mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
              おかえりなさい！
              <span className="block text-lg sm:text-xl md:text-2xl text-orange-600 font-semibold mt-1 sm:mt-2">
                {user?.nameKana || "ユーザー"}さん
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">
              Juice Academyのドリンクバーサービスへようこそ。美味しいドリンクをお楽しみください。
            </p>
          </div>
        </div>

        {/* お知らせセクション - 最上部に配置 */}
        <div className="mb-6 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">最新のお知らせ</h2>
            <Link
              to="/announcements"
              className="text-orange-600 hover:text-orange-700 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap"
            >
              すべて見る →
            </Link>
          </div>

          {loading ? (
            <Card className="text-center py-12">
              <LoadingSpinner size="large" />
              <p className="mt-4 text-gray-600">お知らせを読み込み中...</p>
            </Card>
          ) : error ? (
            <Card variant="simple" className="text-center py-12">
              <div className="text-red-500 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">{error}</p>
            </Card>
          ) : announcements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  isNew={isNewAnnouncement(announcement.createdAt)}
                />
              ))}
            </div>
          ) : (
            <Card variant="simple" className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-gray-600">現在お知らせはありません</p>
            </Card>
          )}
        </div>

        {/* サブスクリプション説明セクション */}
        <Card variant="featured" className="mb-6 sm:mb-12">
          <div className="text-center py-4 sm:py-8 px-2 sm:px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-6">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">
              ドリンクバーサービス
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed">
              月額3,000円でキャンパス内のドリンクサーバーが使い放題！コーヒー、紅茶、ジュース、炭酸飲料など豊富なメニューをご用意しています。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              {checkingSubscription ? (
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                  <span>確認中...</span>
                </div>
              ) : (
                <>
                  <Link to="/subscription" className="btn-primary">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    {hasActiveSubscription
                      ? "サブスク確認・管理"
                      : "サブスクリプション登録"}
                  </Link>
                  <Link to="/mypage" className="btn-secondary">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    マイページ
                  </Link>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* 現在準備中セクション */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-12">
          <Card variant="simple" className="text-center py-4 sm:py-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">
              設置場所案内
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
              ドリンクサーバー設置場所をマップで確認
            </p>
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              準備中
            </span>
          </Card>

          <Card variant="simple" className="text-center py-4 sm:py-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">
              利用統計
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
              月間利用回数や人気ドリンクランキングを表示
            </p>
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              準備中
            </span>
          </Card>

          <Card variant="simple" className="text-center py-4 sm:py-8 sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">
              営業時間
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
              各設置場所の営業時間とメンテナンス情報
            </p>
            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              準備中
            </span>
          </Card>
        </div>

        {/* 管理者向けセクション */}
        {isAdmin && (
          <Card variant="elevated" className="mb-4 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
              </svg>
              管理者メニュー
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => handleAdminNavigate("/admin/announcements")}
                className="btn-outline w-full text-left"
                type="button"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
                お知らせ管理
              </button>
              <button
                onClick={() =>
                  handleAdminNavigate("/admin/announcements/create")
                }
                className="btn-primary w-full text-left"
                type="button"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                新しいお知らせを作成
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
