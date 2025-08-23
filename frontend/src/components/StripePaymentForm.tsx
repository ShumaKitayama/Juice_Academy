import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { paymentAPI } from "../services/api";
import { stripePromise } from "../services/stripe";
import Button from "./Button";
import ErrorAlert from "./ErrorAlert";
import LoadingSpinner from "./LoadingSpinner";
import SuccessAlert from "./SuccessAlert";

// APIエラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

// Stripeエラーメッセージの日本語化
const translateStripeError = (errorMessage: string): string => {
  const errorMap: { [key: string]: string } = {
    "Your card number is incomplete.": "カード番号が不完全です。",
    "Your card number is invalid.": "カード番号が無効です。",
    "Your card's expiration date is incomplete.":
      "カードの有効期限が不完全です。",
    "Your card's expiration date is invalid.": "カードの有効期限が無効です。",
    "Your card's security code is incomplete.":
      "セキュリティコードが不完全です。",
    "Your card's security code is invalid.": "セキュリティコードが無効です。",
    "Your card has expired.": "カードの有効期限が切れています。",
    "Your card was declined.": "カードが拒否されました。",
    "Your card's security code is incorrect.":
      "セキュリティコードが正しくありません。",
    "Your card does not support this type of purchase.":
      "お使いのカードはこのタイプの購入をサポートしていません。",
    "Your card has insufficient funds.": "カードの残高が不足しています。",
    "There was a problem with your card.": "カードに問題がありました。",
  };

  // エラーメッセージが登録されていない場合はそのまま返す
  return errorMap[errorMessage] || errorMessage;
};

// 実際のフォームコンポーネント
const PaymentForm: React.FC<{
  onSuccess: () => void;
  clientSecret: string;
}> = ({ onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setProcessing(true);
    setError(null);

    // Stripeに支払い方法を登録
    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-confirmation`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(
        translateStripeError(
          stripeError.message || "カード情報の登録に失敗しました"
        )
      );
      setProcessing(false);
      return;
    }

    if (setupIntent && setupIntent.status === "succeeded") {
      try {
        // バックエンドに支払い方法の登録を通知
        await paymentAPI.confirmSetup(
          user.id,
          setupIntent.payment_method as string
        );
        setSucceeded(true);
        onSuccess();
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setError(
          apiError.response?.data?.error || "支払い方法の登録に失敗しました"
        );
      }
    } else {
      setError("支払い方法の登録に失敗しました");
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-lg shadow-md card-payment-form">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            クレジットカード情報
          </h3>
          <div className="flex space-x-2">
            <img
              src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-design-system/assets/img/logos/visa.png"
              alt="visa"
              className="h-6"
            />
            <img
              src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-design-system/assets/img/logos/mastercard.png"
              alt="mastercard"
              className="h-6"
            />
            <img
              src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-design-system/assets/img/logos/amex.png"
              alt="amex"
              className="h-6"
            />
          </div>
        </div>

        {error && <ErrorAlert message={error} className="animate-slide-up" />}
        {succeeded && (
          <SuccessAlert
            message="カード情報が正常に登録されました"
            className="animate-slide-up"
          />
        )}

        <div className="mb-6">
          <PaymentElement
            options={{
              layout: "tabs",
              fields: {
                billingDetails: {
                  name: "auto",
                  email: "auto",
                },
              },
              terms: {
                card: "never",
              },
            }}
          />
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <p>
              *
              セキュリティのため、カード情報は当サイトのサーバーには保存されません。
            </p>
            <p>
              * テスト用カード番号: 4242 4242 4242 4242 (有効期限:
              任意の未来日付、CVC: 任意の3桁)
            </p>
          </div>
          <div className="mt-4 flex items-center p-3 bg-blue-50 rounded-md">
            <svg
              className="h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-2 text-xs text-blue-700">
              このフォームは暗号化されており、安全に情報を送信できます
            </span>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="large"
          isLoading={processing}
          disabled={processing || !stripe || succeeded}
          fullWidth
          className="btn-hover-effect"
        >
          {succeeded ? "登録済み" : "カード情報を登録する"}
        </Button>
      </div>
    </form>
  );
};

// 親コンポーネント
interface StripePaymentFormProps {
  onSuccess: () => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ onSuccess }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // コンポーネントマウント時にSetupIntentを取得
  useEffect(() => {
    const getSetupIntent = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await paymentAPI.createSetupIntent(user.id);
        setClientSecret(response.data.clientSecret);
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setError(
          apiError.response?.data?.error || "SetupIntentの取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    getSetupIntent();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="medium" message="決済フォームを読み込み中..." />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!clientSecret) {
    return (
      <ErrorAlert message="決済情報の取得に失敗しました。再度お試しください。" />
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#4f46e5",
            colorBackground: "#ffffff",
            colorText: "#1f2937",
            colorDanger: "#ef4444",
            fontFamily:
              '"Noto Sans JP", "Helvetica Neue", Helvetica, sans-serif',
            spacingUnit: "4px",
            borderRadius: "8px",
          },
          rules: {
            ".Input": {
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              padding: "12px",
            },
            ".Input:focus": {
              border: "1px solid #4f46e5",
              boxShadow: "0 0 0 1px #4f46e5",
            },
            ".Input--invalid": {
              border: "1px solid #ef4444",
              boxShadow: "0 0 0 1px #ef4444",
            },
            ".Tab": {
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            },
            ".Tab:hover": {
              border: "1px solid #4f46e5",
            },
            ".Tab--selected": {
              border: "1px solid #4f46e5",
              boxShadow: "0 0 0 1px #4f46e5",
            },
          },
        },
      }}
    >
      <PaymentForm onSuccess={onSuccess} clientSecret={clientSecret} />
    </Elements>
  );
};

export default StripePaymentForm;
