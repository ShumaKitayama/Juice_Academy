import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// .envファイルからStripe公開キーを取得
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

// Stripeの初期化
export const stripePromise = loadStripe(stripePublicKey);

// Stripeのエレメントプロバイダーコンポーネント
export const StripeElementsProvider = Elements;

// Stripeサービス
export const stripeService = {
  // Stripeの公開キーを取得
  getPublicKey: () => stripePublicKey,
  
  // Stripeのインスタンスを取得
  getInstance: () => stripePromise,
};

export default stripeService; 