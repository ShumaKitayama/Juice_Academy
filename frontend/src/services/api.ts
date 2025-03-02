import axios from 'axios';

// APIのベースURL
const API_URL = 'http://localhost:8080/api';

// Axiosインスタンスの作成
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response && error.response.status === 401) {
      // 認証エラーの場合、ログアウト処理
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
    return api.post('/register', userData);
  },

  // ログイン
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/login', credentials);
    // トークンとユーザー情報をローカルストレージに保存
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response;
  },

  // ログアウト
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // 現在のユーザー情報を取得
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // ログイン状態をチェック
  isAuthenticated: () => {
    return localStorage.getItem('token') !== null;
  },
};

// 決済関連のAPI
export const paymentAPI = {
  // Stripe顧客を作成
  createStripeCustomer: async () => {
    return api.post('/payment/customer');
  },

  // SetupIntentを作成
  createSetupIntent: async (userId: string) => {
    return api.post('/payment/setup-intent', { userId });
  },

  // 支払い方法の確認
  confirmSetup: async (userId: string, paymentMethodId: string) => {
    return api.post('/payment/confirm-setup', { userId, paymentMethodId });
  },

  // サブスクリプションを作成
  createSubscription: async (userId: string, priceId: string) => {
    return api.post('/payment/subscription', { userId, priceId });
  },

  // 決済履歴を取得
  getPaymentHistory: async () => {
    return api.get('/payment/history');
  },

  // 支払い方法一覧を取得
  getPaymentMethods: async () => {
    return api.get('/payment/methods');
  },

  // 支払い方法を削除
  deletePaymentMethod: async (paymentMethodId: string) => {
    return api.delete(`/payment/methods/${paymentMethodId}`);
  },

  // デフォルトの支払い方法を設定
  setDefaultPaymentMethod: async (paymentMethodId: string) => {
    return api.post('/payment/methods/default', { paymentMethodId });
  },
};

export default api; 