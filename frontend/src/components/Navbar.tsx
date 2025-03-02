import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-juice-orange-400 to-juice-orange-600">
                Juice Academy
              </span>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/" 
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/' 
                      ? 'text-juice-orange-600' 
                      : 'text-gray-700 hover:text-juice-orange-500'
                  }`}
                >
                  トップページ
                </Link>
                <Link 
                  to="/mypage" 
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    location.pathname.includes('/mypage') 
                      ? 'text-juice-orange-600' 
                      : 'text-gray-700 hover:text-juice-orange-500'
                  }`}
                >
                  マイページ
                </Link>
                <div className="relative ml-3">
                  <div className="flex items-center">
                    <button 
                      onClick={handleLogout}
                      className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-juice-orange-500 hover:bg-juice-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-400"
                    >
                      ログアウト
                    </button>
                    <div className="ml-3 flex items-center">
                      <div className="h-8 w-8 rounded-full bg-juice-orange-200 flex items-center justify-center text-juice-orange-600 font-medium">
                        {user?.nameKana?.charAt(0) || 'U'}
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {user?.nameKana || 'ユーザー'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="ml-4 inline-flex items-center px-4 py-2 border border-juice-orange-500 text-sm font-medium rounded-md text-juice-orange-600 bg-white hover:bg-juice-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-400"
                >
                  ログイン
                </Link>
                <Link 
                  to="/register" 
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-juice-orange-500 hover:bg-juice-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-400"
                >
                  新規登録
                </Link>
              </>
            )}
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-juice-orange-500 hover:bg-juice-orange-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-juice-orange-400"
            >
              <span className="sr-only">メニューを開く</span>
              {isMenuOpen ? (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === '/' 
                      ? 'text-juice-orange-600 bg-juice-orange-50' 
                      : 'text-gray-700 hover:text-juice-orange-500 hover:bg-juice-orange-50'
                  }`}
                  onClick={toggleMenu}
                >
                  トップページ
                </Link>
                <Link 
                  to="/mypage" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname.includes('/mypage') 
                      ? 'text-juice-orange-600 bg-juice-orange-50' 
                      : 'text-gray-700 hover:text-juice-orange-500 hover:bg-juice-orange-50'
                  }`}
                  onClick={toggleMenu}
                >
                  マイページ
                </Link>
                <div className="pt-4 pb-3 border-t border-gray-200">
                  <div className="flex items-center px-3">
                    <div className="h-8 w-8 rounded-full bg-juice-orange-200 flex items-center justify-center text-juice-orange-600 font-medium">
                      {user?.nameKana?.charAt(0) || 'U'}
                    </div>
                    <span className="ml-3 text-base font-medium text-gray-700">
                      {user?.nameKana || 'ユーザー'}
                    </span>
                  </div>
                  <div className="mt-3 px-2">
                    <button
                      onClick={() => {
                        handleLogout();
                        toggleMenu();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-juice-orange-500 hover:bg-juice-orange-50"
                    >
                      ログアウト
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-juice-orange-500 hover:bg-juice-orange-50"
                  onClick={toggleMenu}
                >
                  ログイン
                </Link>
                <Link 
                  to="/register" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-juice-orange-500 hover:bg-juice-orange-50"
                  onClick={toggleMenu}
                >
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar; 