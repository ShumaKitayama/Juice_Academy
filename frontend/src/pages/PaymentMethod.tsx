import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
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

// 支払い方法型定義
interface PaymentMethodType {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault?: boolean;
}

const PaymentMethod: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // 支払い方法を取得
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await paymentAPI.getPaymentMethods();
        setPaymentMethods(response.data.paymentMethods || []);
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setError(
          apiError.response?.data?.error || "支払い方法の取得に失敗しました",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [user]);

  // 支払い方法を削除
  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      await paymentAPI.deletePaymentMethod(paymentMethodId);

      // 支払い方法リストを更新
      const updatedMethods = paymentMethods.filter(
        (method) => method.id !== paymentMethodId,
      );
      setPaymentMethods(updatedMethods);

      setSuccess("支払い方法が正常に削除されました");

      // 成功メッセージを3秒後に消す
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.error || "支払い方法の削除に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  };

  // 新しい支払い方法を追加
  const handleAddPaymentMethod = () => {
    navigate("/payment-setup");
  };

  // カード情報を表示用にフォーマット
  const formatCardNumber = (last4: string) => {
    return `•••• •••• •••• ${last4}`;
  };

  // カード有効期限をフォーマット
  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`;
  };

  // カードブランドのロゴを取得
  const getCardBrandLogo = (brand: string) => {
    const brandLower = brand.toLowerCase();

    switch (brandLower) {
      case "visa":
        return (
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
        );
      case "mastercard":
        return (
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
        );
      case "amex":
        return (
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
        );
      default:
        return (
          <svg
            className="h-6 w-10"
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#6B7280" />
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontFamily="Arial"
              fontSize="7"
              fontWeight="bold"
            >
              CARD
            </text>
          </svg>
        );
    }
  };

  if (loading && paymentMethods.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="medium" message="支払い方法を読み込み中…" />
      </div>
    );
  }

  return (
    <div className="text-left">
      <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3">
        支払い方法
      </h2>

      {error && <ErrorAlert message={error} className="mb-3" />}
      {success && <SuccessAlert message={success} className="mb-3" />}

      <div className="space-y-4 sm:space-y-6">
        {paymentMethods.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {paymentMethods.map((method) => (
                <li key={method.id} className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex items-center">
                      {method.card.brand && (
                        <div className="mr-2 sm:mr-3 flex-shrink-0">
                          {getCardBrandLogo(method.card.brand)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCardNumber(method.card.last4)}
                        </p>
                        <p className="text-xs text-gray-500">
                          有効期限:{" "}
                          {formatExpiry(
                            method.card.exp_month,
                            method.card.exp_year,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end sm:justify-start gap-2 sm:gap-3">
                      {method.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          デフォルト
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="text-sm text-red-600 hover:text-red-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded"
                        disabled={loading}
                        aria-label={`カード ${method.card.last4} を削除`}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 text-center">
            <svg
              className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h3 className="mt-2 text-xs sm:text-sm font-medium text-gray-900">
              支払い方法が登録されていません
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              サービスを利用するには、カード情報の登録が必要です。
            </p>
          </div>
        )}

        <div className="flex justify-center sm:justify-end">
          <Button
            variant="primary"
            size="medium"
            onClick={handleAddPaymentMethod}
            disabled={loading || paymentMethods.length > 0}
            className="w-full sm:w-auto text-sm"
          >
            新しい支払い方法を追加
          </Button>
        </div>

        <div className="bg-juice-orange-50 p-3 sm:p-4 rounded-lg border border-juice-orange-100">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-juice-orange-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-juice-orange-800">
                支払い方法について
              </h3>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-juice-orange-700">
                <p className="leading-relaxed">
                  登録されたクレジットカードは、サブスクリプションの自動更新に使用されます。カード情報はStripeの安全な環境で管理され、当サイトのサーバーには保存されません。
                  {paymentMethods.length > 0 && (
                    <span className="block mt-2 font-medium">
                      ※
                      現在、カードが登録済みのため新しいカードの追加はできません。
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;
