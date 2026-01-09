import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import StripePaymentForm from "../components/StripePaymentForm";
import SuccessAlert from "../components/SuccessAlert";
import { useAuth } from "../hooks/useAuth";
import { paymentAPI } from "../services/api";

// APIエラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
}

const PaymentSetup: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // 既存の支払い方法を確認
  useEffect(() => {
    const checkExistingPaymentMethods = async () => {
      if (!user) return;

      try {
        const response = await paymentAPI.getPaymentMethods();
        if (
          response.data.paymentMethods &&
          response.data.paymentMethods.length > 0
        ) {
          // 既に支払い方法が登録されている場合は支払い方法管理ページにリダイレクト
          navigate("/payment-method");
        }
      } catch {
        // エラーが発生しても続行（支払い方法がない可能性）
      }
    };

    checkExistingPaymentMethods();
  }, [user, navigate]);

  // Stripe顧客情報を作成
  useEffect(() => {
    const createStripeCustomer = async () => {
      if (!user) return;

      try {
        setLoading(true);
        await paymentAPI.createStripeCustomer();
        setHasStripeCustomer(true);
      } catch (err: unknown) {
        const apiError = err as ApiError;
        // 既に顧客情報が存在する場合はエラーにしない
        if (
          apiError.response?.data?.message?.includes(
            "既に支払い情報が登録されています"
          )
        ) {
          setHasStripeCustomer(true);
        } else {
          setError(
            apiError.response?.data?.error ||
              "Stripe顧客情報の作成に失敗しました"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    createStripeCustomer();
  }, [user]);

  // 支払い方法登録成功時の処理
  const handlePaymentMethodSuccess = () => {
    setSuccess(true);
    // サブスクリプション登録ページに遷移
    setTimeout(() => {
      navigate("/subscription");
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-fade-in">
          <LoadingSpinner size="large" message="決済情報を準備しています..." />
          <p className="mt-4 text-gray-500">少々お待ちください...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 px-2">
            決済情報の登録
          </h1>
          <p className="mt-2 text-sm sm:text-base md:text-lg text-gray-600 px-2">
            サービスを利用するには、カード情報の登録が必要です。
          </p>
        </div>

        {error && <ErrorAlert message={error} className="animate-slide-up" />}
        {success && (
          <SuccessAlert
            message="カード情報が正常に登録されました。サブスクリプションページに移動します。"
            className="animate-slide-up"
          />
        )}

        {hasStripeCustomer ? (
          <div className="animate-slide-up">
            <StripePaymentForm onSuccess={handlePaymentMethodSuccess} />
          </div>
        ) : (
          <Card className="animate-slide-up">
            <div
              className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <p className="font-bold">エラー</p>
              <p className="block sm:inline">
                Stripe顧客情報の作成に失敗しました。再度お試しください。
              </p>
            </div>
          </Card>
        )}

        <Card
          className="mt-6 sm:mt-8 card-hover animate-slide-up"
          style={{ animationDelay: "150ms" }}
        >
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
            安全なお支払い
          </h3>
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6 text-green-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                当サイトでは、クレジットカード情報を直接保存せず、Stripeの安全な決済システムを利用しています。カード情報はStripeのセキュアな環境で管理され、PCI DSSに準拠した高度なセキュリティ対策が施されています。
              </p>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex items-start space-x-3 sm:space-x-4">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                登録されたカード情報は、今後の定期支払いに使用されます。いつでもマイページから支払い方法の変更や解約が可能です。
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
            <div className="flex justify-center space-x-4 sm:space-x-6">
              <svg
                className="h-6 w-10 sm:h-8 sm:w-12"
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
                className="h-6 w-10 sm:h-8 sm:w-12"
                viewBox="0 0 48 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="48" height="32" rx="4" fill="#EB001B" />
                <circle cx="18" cy="16" r="8" fill="#EB001B" />
                <circle cx="30" cy="16" r="8" fill="#F79E1B" />
              </svg>
              <svg
                className="h-6 w-10 sm:h-8 sm:w-12"
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
            <p className="text-center text-xs text-gray-500 mt-3 sm:mt-4">
              主要なクレジットカードがご利用いただけます
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSetup;
