import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorAlert from "../components/ErrorAlert";
import PaymentSummary from "../components/PaymentSummary";
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

// サブスクリプション状態の型定義
interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription?: {
    id: string;
    status: string;
    price_id: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
}

// サブスクリプションプラン
const subscriptionPlans = [
  {
    id: "plan_monthly",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY,
    name: "月額プラン",
    price: 3000,
    interval: "月",
    description: "標準的な月額プラン",
    features: ["ドリンクサーバーの利用が可能", "いつでも解約可能"],
    color: "blue",
  },
  {
    id: "plan_yearly",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY,
    name: "年額プラン",
    price: 9800,
    interval: "年",
    description: "月額プランより約72%お得",
    features: [
      "ドリンクサーバーの利用が可能",
      "月額プランより約72%お得",
      "1年ごとの自動更新",
    ],
    color: "orange",
  },
  {
    id: "plan_2years",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_2YEARS,
    name: "2年プラン",
    price: 18000,
    interval: "2年",
    description: "長期利用でさらにお得",
    features: [
      "ドリンクサーバーの利用が可能",
      "年額プランよりさらにお得",
      "2年ごとの自動更新",
    ],
    color: "purple",
  },
];

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  const { user } = useAuth();

  // サブスクリプション状態と支払い方法を確認
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        // 並行して取得
        const [subResponse, pmResponse] = await Promise.all([
          paymentAPI.getSubscriptionStatus().catch(() => ({
            data: {
              hasActiveSubscription: false,
              subscription: undefined,
            },
          })),
          paymentAPI.getPaymentMethods().catch(() => ({
            data: { paymentMethods: [] },
          })),
        ]);

        setSubscriptionStatus(subResponse.data);

        const methods = pmResponse.data?.paymentMethods;
        setHasPaymentMethod(Array.isArray(methods) && methods.length > 0);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [user]);

  // 選択されたプランの情報を取得
  const getSelectedPlanInfo = () => {
    return subscriptionPlans.find((plan) => plan.id === selectedPlan);
  };

  // 次回請求日を計算
  const getNextBillingDate = (interval: string) => {
    const date = new Date();
    if (interval === "月") {
      date.setMonth(date.getMonth() + 1);
    } else if (interval === "年") {
      date.setFullYear(date.getFullYear() + 1);
    } else if (interval === "2年") {
      date.setFullYear(date.getFullYear() + 2);
    }
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // プラン選択ハンドラ
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  // サブスクリプション登録ハンドラ
  const handleSubscribe = async () => {
    if (!selectedPlan || !user) return;

    // 支払い方法がない場合は登録ページへ誘導
    if (!hasPaymentMethod && !hasActiveSubscription) {
      navigate("/payment-setup");
      return;
    }

    if (hasActiveSubscription && isCanceled) {
      const isReactivation = selectedPlan === activePriceId;
      const confirmMessage = isReactivation
        ? `現在の契約期間（${formatDate(
            currentPeriodEnd,
          )}まで）が残っていますが、契約を再開しますか？`
        : `現在の契約期間（${formatDate(
            currentPeriodEnd,
          )}まで）が残っていますが、プランを変更しますか？`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const selectedPlanInfo = getSelectedPlanInfo();
      if (!selectedPlanInfo) {
        throw new Error("プラン情報が見つかりません");
      }

      // サブスクリプションを作成（既存のカード情報を使用）
      const response = await paymentAPI.createSubscription(
        selectedPlanInfo.priceId,
      );

      // レスポンスに含まれるリダイレクト先に移動
      if (response.data.redirect) {
        window.location.href = response.data.redirect;
      } else if (response.data.url) {
        // 後方互換性のため、urlがある場合はそちらにリダイレクト
        window.location.href = response.data.url;
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.error ||
          "サブスクリプションの登録に失敗しました",
      );
      setLoading(false);
    }
  };

  const selectedPlanInfo = getSelectedPlanInfo();

  const isCanceled = subscriptionStatus?.subscription?.cancel_at_period_end;
  const currentPeriodEnd = subscriptionStatus?.subscription?.current_period_end;
  const activePriceId = subscriptionStatus?.subscription?.price_id;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // サブスクリプション状態を確認中
  if (checkingStatus) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div
            className="animate-spin rounded-full size-12 border-b-2 border-juice-orange-600 mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-gray-600">サブスクリプション状態を確認中…</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription;

  return (
    <div className="min-h-dvh bg-gray-50 py-4 sm:py-6 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 px-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            プラン選択
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-lg text-gray-500 text-pretty">
            {hasActiveSubscription
              ? "登録中のプランを確認"
              : "最適なプランを選択してください"}
          </p>
        </div>

        {hasActiveSubscription && (
          <Card
            className={`mb-6 sm:mb-8 border-2 ${
              isCanceled
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            }`}
            padding="small"
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  isCanceled ? "bg-yellow-100" : "bg-green-100"
                }`}
              >
                <svg
                  className={`w-6 h-6 ${
                    isCanceled ? "text-yellow-600" : "text-green-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isCanceled ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
              </div>
              <h3
                className={`text-lg font-semibold ${
                  isCanceled ? "text-yellow-900" : "text-green-900"
                }`}
              >
                {isCanceled ? "解約予約済み" : "登録済み"}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  isCanceled ? "text-yellow-700" : "text-green-700"
                }`}
              >
                {isCanceled
                  ? `${formatDate(currentPeriodEnd)} に終了`
                  : "以下のプランをご利用中"}
              </p>
            </div>
          </Card>
        )}

        {error && <ErrorAlert message={error} className="animate-slide-up" />}

        <div className="mt-6 sm:mt-12 lg:mt-16 space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4 lg:gap-6 lg:max-w-6xl lg:mx-auto px-1 sm:px-0">
          {subscriptionPlans.map((plan, index) => (
            <div key={index} className="subscription-option flex">
              <Card
                className={`relative flex flex-col w-full divide-y divide-gray-200 plan-card animate-slide-up overflow-hidden ${
                  selectedPlan === plan.id
                    ? "selected ring-2 ring-offset-2 ring-juice-orange-500"
                    : ""
                } ${hasActiveSubscription ? "opacity-90" : ""}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {plan.id === "plan_yearly" && !hasActiveSubscription && (
                  <div className="absolute -top-1 -right-1 z-20">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-juice-orange-500 via-juice-orange-600 to-juice-orange-700 text-white text-[11px] sm:text-xs font-bold px-5 sm:px-6 py-2 sm:py-2.5 shadow-xl transform origin-center">
                        <span className="relative z-10 tracking-wide whitespace-nowrap drop-shadow-sm">
                          おすすめ
                        </span>
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/25 rounded-t-sm"></div>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-juice-orange-800 transform rotate-45 shadow-md"></div>
                    </div>
                  </div>
                )}
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <h2
                    className={`text-base sm:text-lg leading-6 font-bold text-center ${
                      hasActiveSubscription
                        ? "text-gray-700"
                        : `text-${plan.color}-600`
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <p className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-500 text-center min-h-[2rem] sm:min-h-[2.5rem]">
                    {plan.description}
                  </p>
                  <p className="mt-4 sm:mt-8 text-center">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">
                      ¥{plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm sm:text-base font-medium text-gray-500">
                      /{plan.interval}
                    </span>
                  </p>

                  {hasActiveSubscription && !isCanceled ? (
                    <div className="mt-auto space-y-3 pt-4 sm:pt-8">
                      {subscriptionStatus?.subscription?.price_id ===
                        plan.priceId && (
                        <div className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-green-100 border-2 border-green-500 text-green-800 font-semibold rounded-md text-center text-sm sm:text-base">
                          選択中
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-auto pt-4 sm:pt-8">
                      {hasActiveSubscription &&
                      activePriceId === plan.priceId &&
                      isCanceled ? (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="w-full px-3 sm:px-4 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs sm:text-sm font-semibold rounded-md text-center mb-2">
                            終了予定
                          </div>
                          <Button
                            type="button"
                            onClick={() => handlePlanSelect(plan.id)}
                            variant="primary"
                            fullWidth
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {selectedPlan === plan.id
                              ? "選択中"
                              : "契約を再開する"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handlePlanSelect(plan.id)}
                          variant={
                            selectedPlan === plan.id ? "primary" : "outline"
                          }
                          fullWidth
                          className={`btn-hover-effect transition-all duration-200 ${
                            selectedPlan === plan.id
                              ? `bg-${plan.color}-600 hover:bg-${plan.color}-700 text-white shadow-lg transform scale-105`
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {selectedPlan === plan.id ? "選択中" : "選択する"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="pt-4 sm:pt-6 pb-6 sm:pb-8 px-4 sm:px-6 bg-gray-50 flex-1">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                    含まれる機能
                  </h3>
                  <ul className="mt-3 sm:mt-6 space-y-2 sm:space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className={`flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 text-${plan.color}-500 mt-0.5`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-500">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {selectedPlanInfo && (
          <div className="mt-6 sm:mt-12 max-w-lg mx-auto animate-slide-up px-2 sm:px-0">
            <PaymentSummary
              planName={selectedPlanInfo.name}
              planPrice={selectedPlanInfo.price}
              billingPeriod={
                selectedPlanInfo.interval === "月"
                  ? "月額"
                  : selectedPlanInfo.interval === "年"
                    ? "年額"
                    : "2年一括"
              }
              nextBillingDate={getNextBillingDate(selectedPlanInfo.interval)}
              tax={10}
            />
          </div>
        )}

        {(!hasActiveSubscription || isCanceled) && (
          <div className="mt-6 sm:mt-10 text-center px-2 sm:px-0">
            <Button
              onClick={handleSubscribe}
              variant="primary"
              size="large"
              isLoading={loading}
              disabled={!selectedPlan || loading}
              className="w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base"
            >
              {hasActiveSubscription && isCanceled
                ? "プランを更新・再開する"
                : !hasPaymentMethod
                  ? "支払い方法を登録して次へ"
                  : "サブスクリプションを開始する"}
            </Button>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
              * サブスクリプションはいつでもキャンセルできます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
