// 環境設定の管理

/**
 * API URLを構築するヘルパー関数
 * VITE_API_URLが既に"/api"で終わっている場合は重複を避ける
 */
const buildApiUrl = (): string => {
  const baseUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === "production"
      ? `${window.location.origin}`
      : "http://localhost:8080");

  // 既に /api で終わっている場合はそのまま返す
  if (baseUrl.endsWith("/api")) {
    return baseUrl;
  }

  // /api で終わっていない場合は追加
  return `${baseUrl}/api`;
};

export const config = {
  apiUrl: buildApiUrl(),

  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",

  isDevelopment: import.meta.env.MODE === "development",
  isProduction: import.meta.env.MODE === "production",

  // ログレベル設定
  enableConsoleLog: import.meta.env.MODE !== "production",

  // デバッグ設定
  enableDebugMode:
    import.meta.env.VITE_DEBUG === "true" ||
    import.meta.env.MODE === "development",
};

// ログ用ヘルパー関数
export const logger = {
  log: (...args: unknown[]) => {
    if (config.enableConsoleLog) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (config.enableConsoleLog) {
      console.error(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (config.enableConsoleLog) {
      console.warn(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (config.enableDebugMode) {
      console.debug(...args);
    }
  },
};

// 環境チェック用ヘルパー関数
export const isProduction = () => config.isProduction;
export const isDevelopment = () => config.isDevelopment;

// API URL取得
export const getApiUrl = () => config.apiUrl;

// Stripe公開キー取得
export const getStripePublishableKey = () => {
  if (!config.stripePublishableKey) {
    logger.warn("Stripe公開キーが設定されていません");
  }
  return config.stripePublishableKey;
};
