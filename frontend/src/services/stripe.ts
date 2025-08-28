import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePublishableKey } from '../config/env';

// 環境からStripeパブリッシャブルキーを取得
const stripePublishableKey = getStripePublishableKey();

// Stripeの初期化
export const stripePromise = loadStripe(stripePublishableKey);

// Stripeのエレメントプロバイダーコンポーネント
export const StripeElementsProvider = Elements;

// Stripeサービス
export const stripeService = {
  // Stripeの公開キーを取得
  getPublicKey: () => stripePublishableKey,

  // Stripeのインスタンスを取得
  getInstance: () => stripePromise,
};

export default stripeService;
