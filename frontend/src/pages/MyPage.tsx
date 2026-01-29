import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const focusStyles =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2";

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 px-3 sm:px-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 tracking-tight">
            マイページ
          </h1>
          <p className="text-sm text-gray-500 text-pretty">
            アカウント情報と設定を管理
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* サイドバー */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
            <Card
              variant="featured"
              padding="medium"
              className="rounded-none sm:rounded-xl mb-4 sm:mb-6"
            >
              <div className="text-center">
                <div className="size-14 sm:size-18 rounded-full bg-juice-orange-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto mb-3 ring-4 ring-juice-orange-100 shadow-md">
                  {user?.nameKana?.charAt(0) || "U"}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-0.5 tracking-tight">
                  {user?.nameKana || "ユーザー"}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mb-3 break-all px-2 truncate">
                  {user?.email || "メールアドレス"}
                </p>
                {user?.isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-juice-orange-100 text-juice-orange-800 shadow-sm">
                    管理者
                  </span>
                )}
              </div>

              <nav
                className="mt-3 sm:mt-4"
                aria-label="マイページナビゲーション"
              >
                <ul className="space-y-0.5 sm:space-y-1">
                  <li>
                    <Link
                      to="/mypage"
                      className={`nav-link flex items-center text-sm py-2 sm:py-2.5 rounded-lg ${focusStyles} ${
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
                        className="size-4 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                  </li>

                  <li>
                    <Link
                      to="/mypage/subscription"
                      className={`nav-link flex items-center text-sm py-2 sm:py-2.5 rounded-lg ${focusStyles} ${
                        isActive("/mypage/subscription") ? "active" : ""
                      }`}
                    >
                      <svg
                        className="size-4 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                  </li>

                  <li>
                    <Link
                      to="/mypage/payment-history"
                      className={`nav-link flex items-center text-sm py-2 sm:py-2.5 rounded-lg ${focusStyles} ${
                        isActive("/mypage/payment-history") ? "active" : ""
                      }`}
                    >
                      <svg
                        className="size-4 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                  </li>

                  <li>
                    <Link
                      to="/mypage/payment-method"
                      className={`nav-link flex items-center text-sm py-2 sm:py-2.5 rounded-lg ${focusStyles} ${
                        isActive("/mypage/payment-method") ? "active" : ""
                      }`}
                    >
                      <svg
                        className="size-4 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                  </li>

                  <li>
                    <Link
                      to="/mypage/promotion"
                      className={`nav-link flex items-center text-sm py-2 sm:py-2.5 rounded-lg ${focusStyles} ${
                        isActive("/mypage/promotion") ? "active" : ""
                      }`}
                    >
                      <svg
                        className="size-4 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                  </li>
                </ul>
              </nav>
            </Card>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1 min-w-0">
            <Card
              variant="modern"
              padding="medium"
              hover={false}
              className="rounded-none sm:rounded-xl shadow-sm"
            >
              <Outlet />
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
