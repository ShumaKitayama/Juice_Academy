import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ユーザーが管理者かどうかをチェック
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActivePath = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <nav className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mr-3 shadow-md">
                <span className="text-white font-bold text-lg">J</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Juice Academy
              </span>
            </Link>
          </div>

          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className={`nav-link ${
                    isActivePath("/") &&
                    !isActivePath("/mypage") &&
                    !isActivePath("/admin")
                      ? "active"
                      : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  ホーム
                </Link>

                <Link
                  to="/mypage"
                  className={`nav-link ${
                    isActivePath("/mypage") ? "active" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
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

                {/* 管理者向けメニュー */}
                {isAdmin && (
                  <Link
                    to="/admin/announcements"
                    className={`nav-link ${
                      isActivePath("/admin") ? "active" : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    管理
                  </Link>
                )}

                {/* ユーザー情報とログアウト */}
                <div className="flex items-center ml-4 pl-4 border-l border-gray-200">
                  <div className="flex items-center mr-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user?.nameKana?.charAt(0) || "U"}
                    </div>
                    <div className="ml-3 hidden lg:block">
                      <span className="text-sm font-medium text-gray-700">
                        {user?.nameKana || "ユーザー"}
                      </span>
                      {isAdmin && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          管理者
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="btn-outline text-sm px-4 py-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    ログアウト
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="btn-outline">
                  ログイン
                </Link>
                <Link to="/register" className="btn-primary">
                  新規登録
                </Link>
              </div>
            )}
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">メニューを開く</span>
              {isMenuOpen ? (
                <svg
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pt-4 pb-4 animate-slide-down">
            {isAuthenticated ? (
              <div className="space-y-2">
                {/* ユーザー情報 */}
                <div className="flex items-center px-3 py-3 bg-gray-50 rounded-lg mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                    {user?.nameKana?.charAt(0) || "U"}
                  </div>
                  <div className="ml-3">
                    <span className="block text-base font-medium text-gray-800">
                      {user?.nameKana || "ユーザー"}
                    </span>
                    <span className="block text-sm text-gray-500">
                      {user?.email}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                        管理者
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to="/"
                  className={`block nav-link ${
                    isActivePath("/") &&
                    !isActivePath("/mypage") &&
                    !isActivePath("/admin")
                      ? "active"
                      : ""
                  }`}
                  onClick={toggleMenu}
                >
                  ホーム
                </Link>

                <Link
                  to="/mypage"
                  className={`block nav-link ${
                    isActivePath("/mypage") ? "active" : ""
                  }`}
                  onClick={toggleMenu}
                >
                  マイページ
                </Link>

                {/* モバイル管理者向けメニュー */}
                {isAdmin && (
                  <Link
                    to="/admin/announcements"
                    className={`block nav-link ${
                      isActivePath("/admin") ? "active" : ""
                    }`}
                    onClick={toggleMenu}
                  >
                    管理
                  </Link>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                    className="w-full btn-outline text-left"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block btn-outline w-full text-center"
                  onClick={toggleMenu}
                >
                  ログイン
                </Link>
                <Link
                  to="/register"
                  className="block btn-primary w-full text-center"
                  onClick={toggleMenu}
                >
                  新規登録
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
