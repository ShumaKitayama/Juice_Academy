import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import SuccessAlert from "../components/SuccessAlert";
import { useAuth } from "../hooks/useAuth";
import { paymentAPI } from "../services/api";

// APIエラー型定義
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const PaymentConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const confirmPayment = async () => {
      if (!user) return;

      // URLからsetup_intentとpayment_methodを取得
      const setupIntent = searchParams.get("setup_intent");
      const paymentMethod = searchParams.get("payment_method");

      if (!setupIntent || !paymentMethod) {
        setError("支払い情報が見つかりませんでした。");
        setLoading(false);
        return;
      }

      try {
        // バックエンドに支払い方法の登録を通知
        await paymentAPI.confirmSetup(user.id, paymentMethod);
        setSuccess(true);
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setError(
          apiError.response?.data?.error || "支払い方法の登録に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [user, searchParams]);

  const handleContinue = () => {
    navigate("/subscription");
  };

  const handleRetry = () => {
    navigate("/payment-setup");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-fade-in">
          <LoadingSpinner size="large" message="決済情報を確認しています..." />
          <p className="mt-4 text-gray-500">少々お待ちください...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            決済情報の確認
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            カード情報の登録状況を確認しています。
          </p>
        </div>

        <Card className="animate-slide-up">
          {error && (
            <div className="space-y-6">
              <ErrorAlert message={error} />
              <p className="text-gray-600">
                カード情報の登録に問題が発生しました。もう一度お試しください。
              </p>
              <Button
                variant="primary"
                size="large"
                onClick={handleRetry}
                fullWidth
                className="btn-hover-effect"
              >
                カード登録をやり直す
              </Button>
            </div>
          )}

          {success && (
            <div className="space-y-6">
              <SuccessAlert message="カード情報が正常に登録されました！" />
              <div className="bg-white p-6 rounded-lg border border-green-100">
                <div className="flex items-center mb-4">
                  <svg
                    className="h-8 w-8 text-green-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    登録完了
                  </h3>
                </div>
                <p className="text-gray-600 mb-6">
                  お支払い方法の登録が完了しました。続いて、サブスクリプションプランを選択してください。
                </p>
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleContinue}
                  fullWidth
                  className="btn-hover-effect"
                >
                  サブスクリプション選択へ進む
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card
          className="mt-8 card-hover animate-slide-up"
          style={{ animationDelay: "150ms" }}
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            安全なお支払い
          </h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-green-500"
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
              <p className="text-gray-600 text-sm">
                当サイトでは、クレジットカード情報を直接保存せず、Stripeの安全な決済システムを利用しています。
                カード情報はStripeのセキュアな環境で管理され、PCI
                DSSに準拠した高度なセキュリティ対策が施されています。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
