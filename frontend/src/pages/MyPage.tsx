import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // 現在のパスに基づいてアクティブなリンクを判定
  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">マイページ</h1>
          <p className="text-gray-600">アカウント情報と設定を管理</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* サイドバー */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <Card variant="featured" padding="large" className="mb-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {user?.nameKana?.charAt(0) || "U"}
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {user?.nameKana || "ユーザー"}
                </h2>
                <p className="text-gray-600 mb-4">
                  {user?.email || "メールアドレス"}
                </p>
                {user?.isAdmin && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    管理者
                  </span>
                )}
              </div>

              <nav className="mt-6">
                <div className="space-y-2">
                  <Link
                    to="/mypage"
                    className={`nav-link flex items-center ${
                      isActive("/mypage") &&
                      !isActive("/mypage/subscription") &&
                      !isActive("/mypage/payment-history") &&
                      !isActive("/mypage/payment-method") &&
                      !isActive("/mypage/promotion")
                        ? "active"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
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
                    プロフィール
                  </Link>

                  <Link
                    to="/mypage/subscription"
                    className={`nav-link flex items-center ${
                      isActive("/mypage/subscription") ? "active" : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    サブスクリプション
                  </Link>

                  <Link
                    to="/mypage/payment-history"
                    className={`nav-link flex items-center ${
                      isActive("/mypage/payment-history") ? "active" : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    支払い履歴
                  </Link>

                  <Link
                    to="/mypage/payment-method"
                    className={`nav-link flex items-center ${
                      isActive("/mypage/payment-method") ? "active" : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    支払い方法
                  </Link>

                  <Link
                    to="/mypage/promotion"
                    className={`nav-link flex items-center ${
                      isActive("/mypage/promotion") ? "active" : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    プロモーションコード
                  </Link>
                </div>
              </nav>
            </Card>

            {/* クイックアクション */}
            <Card variant="simple" padding="medium">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                クイックアクション
              </h3>
              <div className="space-y-2 text-sm">
                <Link
                  to="/subscription"
                  className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
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
                  プラン変更
                </Link>
                <Link
                  to="/support"
                  className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  サポート
                </Link>
              </div>
            </Card>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1">
            <Card variant="modern" padding="large">
              <Outlet />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
