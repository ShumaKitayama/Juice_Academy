import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  redirectPath = '/login'
}) => {
  const { isAuthenticated, loading } = useAuth();

  // 認証状態の確認中はローディング表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 認証されていない場合はリダイレクト
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // 認証されている場合は子コンポーネントを表示
  return <Outlet />;
};

export default ProtectedRoute; 