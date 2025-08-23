import React, { createContext, ReactNode, useEffect, useState } from "react";
import { authAPI } from "../services/api";

// ユーザー型定義
interface User {
  id: string;
  email: string;
  role: string;
  studentId: string;
  nameKana: string;
  isAdmin?: boolean; // 管理者フラグを追加
  // Profile.tsxで使用される追加プロパティ
  name?: string;
  phone?: string;
  schoolName?: string;
  position?: string;
  schoolAddress?: string;
}

// エラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
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
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
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
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("認証状態の確認中にエラーが発生しました", err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // storageイベントリスナーを追加（他のタブでの認証状態変更を検知）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // localStorageの変更を検知するためのカスタムイベント
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, []);

  // ログイン処理
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login({ email, password });
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || "ログインに失敗しました");
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
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || "ユーザー登録に失敗しました");
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
    // 認証状態の変更を通知
    window.dispatchEvent(new Event("auth-changed"));
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

export default AuthContext;
