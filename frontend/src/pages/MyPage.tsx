import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // 現在のパスに基づいてアクティブなリンクを判定
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">マイページ</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* サイドバー */}
          <div className="w-full md:w-64 flex-shrink-0">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-juice-orange-400 to-juice-orange-500 px-4 py-5">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-juice-orange-600 font-bold text-xl">
                    {user?.nameKana?.charAt(0) || 'U'}
                  </div>
                  <div className="ml-3">
                    <h2 className="text-white font-medium">{user?.nameKana || 'ユーザー'}</h2>
                    <p className="text-juice-orange-100 text-sm">{user?.email || 'メールアドレス'}</p>
                  </div>
                </div>
              </div>
              
              <nav className="py-2">
                <ul>
                  <li>
                    <Link 
                      to="/mypage" 
                      className={`block px-4 py-2 text-sm ${
                        isActive('/mypage') && !isActive('/mypage/subscription') && !isActive('/mypage/payment-history') && !isActive('/mypage/payment-method')
                          ? 'bg-juice-orange-50 text-juice-orange-600 font-medium'
                          : 'text-gray-700 hover:bg-juice-orange-50 hover:text-juice-orange-500'
                      }`}
                    >
                      プロフィール
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/mypage/subscription" 
                      className={`block px-4 py-2 text-sm ${
                        isActive('/mypage/subscription')
                          ? 'bg-juice-orange-50 text-juice-orange-600 font-medium'
                          : 'text-gray-700 hover:bg-juice-orange-50 hover:text-juice-orange-500'
                      }`}
                    >
                      サブスクリプション管理
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/mypage/payment-history" 
                      className={`block px-4 py-2 text-sm ${
                        isActive('/mypage/payment-history')
                          ? 'bg-juice-orange-50 text-juice-orange-600 font-medium'
                          : 'text-gray-700 hover:bg-juice-orange-50 hover:text-juice-orange-500'
                      }`}
                    >
                      支払い履歴
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/mypage/payment-method" 
                      className={`block px-4 py-2 text-sm ${
                        isActive('/mypage/payment-method')
                          ? 'bg-juice-orange-50 text-juice-orange-600 font-medium'
                          : 'text-gray-700 hover:bg-juice-orange-50 hover:text-juice-orange-500'
                      }`}
                    >
                      支払い方法管理
                    </Link>
                  </li>
                </ul>
              </nav>
            </Card>
          </div>
          
          {/* メインコンテンツ */}
          <div className="flex-1">
            <Card className="p-6">
              <Outlet />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage; 