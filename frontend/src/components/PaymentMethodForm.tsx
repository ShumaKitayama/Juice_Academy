import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { paymentAPI } from "../services/api";
import Button from "./Button";
import ErrorAlert from "./ErrorAlert";
import SuccessAlert from "./SuccessAlert";

// APIエラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

interface PaymentMethodFormProps {
  onSuccess: () => void;
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

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({ onSuccess }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();

  // カードスタイル - 見た目を改善
  const cardStyle = {
    style: {
      base: {
        color: "#32325d",
        fontFamily: '"Noto Sans JP", "Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#aab7c4",
        },
        padding: "12px 15px",
        backgroundColor: "#f8fafc",
        boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
        transition: "box-shadow 0.3s, background-color 0.3s",
      },
      invalid: {
        color: "#fa755a",
        iconColor: "#fa755a",
      },
      complete: {
        color: "#059669",
        iconColor: "#059669",
      },
    },
  };

  // コンポーネントマウント時にSetupIntentを取得
  useEffect(() => {
    const getSetupIntent = async () => {
      if (!user) return;

      try {
        const response = await paymentAPI.createSetupIntent(user.id);
        setClientSecret(response.data.clientSecret);
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setError(
          apiError.response?.data?.error || "SetupIntentの取得に失敗しました"
        );
      }
    };

    getSetupIntent();
  }, [user]);

  // カード入力時のバリデーション
  const handleCardChange = (event: { error?: { message: string } }) => {
    setCardError(
      event.error ? translateStripeError(event.error.message) : null
    );
  };

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret || !user) {
      return;
    }

    // カードエラーがある場合は処理を中止
    if (cardError) {
      return;
    }

    setProcessing(true);
    setError(null);

    // カード情報を取得
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("カード情報の取得に失敗しました");
      setProcessing(false);
      return;
    }

    // Stripeに支払い方法を登録
    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user.nameKana,
            email: user.email,
          },
        },
      }
    );

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
            <svg
              className="h-6 w-10"
              viewBox="0 0 48 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="48" height="32" rx="4" fill="#1434CB" />
              <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontFamily="Arial"
                fontSize="10"
                fontWeight="bold"
              >
                VISA
              </text>
            </svg>
            <svg
              className="h-6 w-10"
              viewBox="0 0 48 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="48" height="32" rx="4" fill="#EB001B" />
              <circle cx="18" cy="16" r="8" fill="#EB001B" />
              <circle cx="30" cy="16" r="8" fill="#F79E1B" />
            </svg>
            <svg
              className="h-6 w-10"
              viewBox="0 0 48 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="48" height="32" rx="4" fill="#006FCF" />
              <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontFamily="Arial"
                fontSize="8"
                fontWeight="bold"
              >
                AMEX
              </text>
            </svg>
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
          <label
            htmlFor="card-element"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            カード情報
          </label>
          <div
            className={`border rounded-md p-4 bg-gray-50 transition-all ${
              cardError
                ? "border-red-500 focus-within:ring-2 focus-within:ring-red-500"
                : "border-gray-300 hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
            }`}
          >
            <CardElement
              id="card-element"
              options={cardStyle}
              onChange={handleCardChange}
              className="py-2"
            />
          </div>
          {cardError && (
            <p className="mt-2 text-sm text-red-600 animate-slide-up">
              {cardError}
            </p>
          )}
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <p>
              *
              セキュリティのため、カード情報は当サイトのサーバーには保存されません。
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
          disabled={
            processing || !stripe || !clientSecret || succeeded || !!cardError
          }
          fullWidth
          className="btn-hover-effect"
        >
          {succeeded ? "登録済み" : "カード情報を登録する"}
        </Button>
      </div>
    </form>
  );
};

export default PaymentMethodForm;
