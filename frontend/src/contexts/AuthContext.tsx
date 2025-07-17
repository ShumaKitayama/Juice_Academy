import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

// ユーザー型定義
interface User {
  id: string;
  email: string;
  role: string;
  studentId: string;
  nameKana: string;
  isAdmin?: boolean;  // 管理者フラグを追加
}

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    role: string;
    student_id: string;
    name_kana: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

// 認証コンテキストの作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認証プロバイダーコンポーネント
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初期化時に認証状態を確認
  useEffect(() => {
    const checkAuth = () => {
      try {
        const currentUser = authAPI.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('認証状態の確認中にエラーが発生しました', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ログイン処理
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login({ email, password });
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ログインに失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ユーザー登録処理
  const register = async (userData: {
    role: string;
    student_id: string;
    name_kana: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await authAPI.register(userData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ユーザー登録に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ログアウト処理
  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // コンテキスト値
  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 認証コンテキストを使用するためのフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 