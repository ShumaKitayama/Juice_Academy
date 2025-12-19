import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getApiUrl } from "../config/env";

const API_URL = getApiUrl();
const ACCESS_TOKEN_KEY = "accessToken";
const CSRF_TOKEN_KEY = "csrfToken";

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const getCsrfToken = () => localStorage.getItem(CSRF_TOKEN_KEY);

const saveSession = (accessToken: string, csrfToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(CSRF_TOKEN_KEY);
  localStorage.removeItem("user");
};

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000,
});

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    const csrfToken = getCsrfToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }

    if (import.meta.env.MODE !== "production") {
      console.log("Sending request:", {
        url: config.url,
        hasToken: !!token,
        hasCsrf: !!csrfToken,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise: Promise<{ accessToken: string; csrfToken: string }> | null =
  null;

const performTokenRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        throw new Error("CSRF token is missing");
      }

      const response = await refreshClient.post(
        "/auth/refresh",
        {},
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        }
      );

      const { accessToken, csrfToken: newCsrfToken, user } = response.data;
      if (!accessToken || !newCsrfToken) {
        throw new Error("Invalid refresh response");
      }

      saveSession(accessToken, newCsrfToken);
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      return { accessToken, csrfToken: newCsrfToken };
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (import.meta.env.MODE !== "production") {
      console.error("API error:", {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      });
    }

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAdminRequest =
      originalRequest?.url && originalRequest.url.includes("/admin/");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        const { accessToken, csrfToken } = await performTokenRefresh();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers["X-CSRF-Token"] = csrfToken;
        }
        return api(originalRequest);
      } catch (refreshError) {
        clearSession();
        if (import.meta.env.MODE !== "production") {
          console.warn("Failed to refresh session", refreshError);
        }
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    if (
      error.response &&
      isAdminRequest &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      if (import.meta.env.MODE !== "production") {
        console.error("管理者権限の確認で失敗:", error.response.data);
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      clearSession();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// 認証関連のAPI
export const authAPI = {
  // ユーザー登録
  register: async (userData: {
    role: string;
    student_id: string;
    name_kana: string;
    email: string;
    password: string;
  }) => {
    return api.post("/register", userData);
  },

  // ログイン
  login: async (credentials: { email: string; password: string }) => {
    return api.post("/login", credentials);
  },

  // ログアウト
  logout: async () => {
    try {
      const csrfToken = getCsrfToken();
      await api.post(
        "/logout",
        {},
        {
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
        }
      );
    } catch (error) {
      if (import.meta.env.MODE !== "production") {
        console.warn("サーバー側のログアウト処理に失敗しました", error);
      }
    } finally {
      clearSession();
    }
  },

  // 現在のユーザー情報を取得
  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // ログイン状態をチェック
  isAuthenticated: () => {
    return getAccessToken() !== null;
  },

  // アクセストークン/CSRFトークンの保存
  saveSession,
  getAccessToken,
  getCsrfToken,
};

// 決済関連のAPI
export const paymentAPI = {
  // Stripe顧客を作成
  createStripeCustomer: async () => {
    return api.post("/payment/customer");
  },

  // SetupIntentを作成
  createSetupIntent: async (userId: string) => {
    return api.post("/payment/setup-intent", { userId });
  },

  // 支払い方法の確認
  confirmSetup: async (userId: string, paymentMethodId: string) => {
    return api.post("/payment/confirm-setup", { userId, paymentMethodId });
  },

  // サブスクリプションを作成（ユーザーIDはサーバー側のJWTから取得）
  createSubscription: async (priceId: string) => {
    return api.post("/payment/subscription", { priceId });
  },

  // 決済履歴を取得
  getPaymentHistory: async () => {
    return api.get("/payment/history");
  },

  // 支払い方法一覧を取得
  getPaymentMethods: async () => {
    return api.get("/payment/methods");
  },

  // 支払い方法を削除
  deletePaymentMethod: async (paymentMethodId: string) => {
    return api.delete(`/payment/methods/${paymentMethodId}`);
  },

  // デフォルトの支払い方法を設定
  setDefaultPaymentMethod: async (paymentMethodId: string) => {
    return api.post("/payment/methods/default", { paymentMethodId });
  },

  // サブスクリプションの状態を取得
  getSubscriptionStatus: async () => {
    return api.get("/subscription/status");
  },

  // サブスクリプションをキャンセル
  cancelSubscription: async () => {
    return api.post("/subscription/cancel");
  },

  // プロモーションコードを適用
  applyPromotionCode: async (code: string) => {
    return api.post("/subscription/promotion", { code });
  },
};

export default api;
