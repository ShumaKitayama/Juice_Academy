import axios from "axios";

// APIのベースURL
const API_URL = "http://localhost:8080/api";

// Axiosインスタンスの作成
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // トークンの形式を確認
      console.log("送信するトークン (抜粋):", token.substring(0, 20) + "...");

      // Authorization ヘッダーを正しく設定
      config.headers.Authorization = `Bearer ${token}`;

      // ヘッダーが正しく設定されたか確認
      console.log("リクエストヘッダー:", config.headers);
      console.log("リクエストURL:", config.url);
    } else {
      console.warn("トークンがありません - 認証なしでリクエストを送信します");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // デバッグ情報：エラーの詳細をコンソールに出力
    console.error("APIエラー発生:", {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });

    // 管理者APIへのリクエストかどうかをチェック
    const isAdminRequest =
      error.config?.url && error.config.url.includes("/admin/");

    if (error.response) {
      // 管理者APIへのリクエストで認証エラー(401)または権限エラー(403)の場合は、
      // ログアウトせずにエラーを返す
      if (
        isAdminRequest &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        console.error("管理者権限に関するエラー:", error.response.data);
        return Promise.reject(error);
      }

      // それ以外の認証エラー(401)の場合、ログアウト処理
      if (error.response.status === 401) {
        console.log("認証エラーのためログアウトします");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
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
    const response = await api.post("/login", credentials);

    console.log("ログインレスポンス:", response.data);

    // レスポンスデータを確認してユーザー情報を処理
    const userData = { ...response.data.user };

    // 管理者フラグをチェック (isAdminフィールドまたはroleフィールド）
    if (response.data.user) {
      // バックエンドのレスポンスからisAdminを取得または推測
      // 1. isAdminがあればそのまま使う
      // 2. roleが'admin'ならisAdminをtrueに設定
      if (response.data.user.isAdmin === true) {
        userData.isAdmin = true;
        console.log("管理者権限を持つユーザーとして認識:", userData);
      } else if (response.data.user.role === "admin") {
        userData.isAdmin = true;
        console.log("管理者ロールを持つユーザーとして認識:", userData);
      } else {
        userData.isAdmin = false;
      }
    }

    // トークンとユーザー情報をローカルストレージに保存
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(userData));

    // ローディング画面を表示するためにsessionStorageを使用
    sessionStorage.removeItem("isLoading");
    sessionStorage.setItem("isLoading", "true");

    console.log("ローカルストレージに保存されたユーザー情報:", userData);
    return { ...response, data: { ...response.data, user: userData } };
  },

  // ログアウト
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
    return localStorage.getItem("token") !== null;
  },
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

  // サブスクリプションを作成
  createSubscription: async (userId: string, priceId: string) => {
    return api.post("/payment/subscription", { userId, priceId });
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
};

export default api;
