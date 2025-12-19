import React, { useState } from "react";
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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);

  const { user } = useAuth();

  // サブスクリプション状態を確認
  React.useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const response = await paymentAPI.getSubscriptionStatus();
        setSubscriptionStatus(response.data);
      } catch {
        // エラー時はサブスクリプションなしとして扱う
        setSubscriptionStatus({
          hasActiveSubscription: false,
          subscription: undefined,
        });
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSubscriptionStatus();
  }, []);

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

    if (hasActiveSubscription && isCanceled) {
      const isReactivation = selectedPlan === activePriceId;
      const confirmMessage = isReactivation
        ? `現在の契約期間（${formatDate(
            currentPeriodEnd
          )}まで）が残っていますが、契約を再開しますか？`
        : `現在の契約期間（${formatDate(
            currentPeriodEnd
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
        selectedPlanInfo.priceId
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
          "サブスクリプションの登録に失敗しました"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">サブスクリプション状態を確認中...</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            サブスクリプションプラン
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            {hasActiveSubscription
              ? "現在登録中のプランを確認できます"
              : "あなたに最適なプランを選択してください"}
          </p>
        </div>

        {hasActiveSubscription && (
          <Card
            className={`mb-8 border-2 ${
              isCanceled
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center justify-center mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
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
              <div>
                <h3
                  className={`text-lg font-semibold ${
                    isCanceled ? "text-yellow-900" : "text-green-900"
                  }`}
                >
                  {isCanceled ? "解約予約済み" : "サブスクリプション登録済み"}
                </h3>
                <p
                  className={`text-sm ${
                    isCanceled ? "text-yellow-700" : "text-green-700"
                  }`}
                >
                  {isCanceled
                    ? `現在の契約は ${formatDate(
                        currentPeriodEnd
                      )} に終了します。再契約またはプラン変更が可能です。`
                    : "現在、以下のプランをご利用中です"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {error && <ErrorAlert message={error} className="animate-slide-up" />}

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-6xl lg:mx-auto">
          {subscriptionPlans.map((plan, index) => (
            <div key={index} className="subscription-option flex">
              <Card
                className={`flex flex-col w-full divide-y divide-gray-200 plan-card animate-slide-up ${
                  selectedPlan === plan.id
                    ? "selected ring-2 ring-offset-2 ring-juice-orange-500"
                    : ""
                } ${hasActiveSubscription ? "opacity-90" : ""}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {plan.id === "plan_yearly" && !hasActiveSubscription && (
                  <div
                    className={`absolute top-0 right-0 -mt-2 -mr-2 bg-${plan.color}-500 rounded-full px-3 py-1 text-white text-xs font-semibold transform rotate-3 shadow-md z-10`}
                  >
                    おすすめ
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h2
                    className={`text-lg leading-6 font-bold text-center ${
                      hasActiveSubscription
                        ? "text-gray-700"
                        : `text-${plan.color}-600`
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <p className="mt-4 text-sm text-gray-500 text-center h-10">
                    {plan.description}
                  </p>
                  <p className="mt-8 text-center">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ¥{plan.price.toLocaleString()}
                    </span>
                    <span className="text-base font-medium text-gray-500">
                      /{plan.interval}
                    </span>
                  </p>

                  {hasActiveSubscription && !isCanceled ? (
                    <div className="mt-auto space-y-3 pt-8">
                      {subscriptionStatus?.subscription?.price_id ===
                        plan.priceId && (
                        <div className="w-full px-4 py-3 bg-green-100 border-2 border-green-500 text-green-800 font-semibold rounded-md text-center">
                          選択中
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-auto pt-8">
                      {hasActiveSubscription &&
                      activePriceId === plan.priceId &&
                      isCanceled ? (
                        <div className="space-y-3">
                          <div className="w-full px-4 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm font-semibold rounded-md text-center mb-2">
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
                <div className="pt-6 pb-8 px-6 bg-gray-50 flex-1">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                    含まれる機能
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className={`flex-shrink-0 h-5 w-5 text-${plan.color}-500 mt-0.5`}
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
                        <span className="ml-3 text-sm text-gray-500">
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
          <div className="mt-12 max-w-lg mx-auto animate-slide-up">
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
          <div className="mt-10 text-center">
            <Button
              onClick={handleSubscribe}
              variant="primary"
              size="large"
              isLoading={loading}
              disabled={!selectedPlan || loading}
              className="px-8 btn-hover-effect bg-gradient-to-r from-blue-500 to-indigo-600 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
            >
              {hasActiveSubscription && isCanceled
                ? "プランを更新・再開する"
                : "サブスクリプションを開始する"}
            </Button>
            <p className="mt-4 text-sm text-gray-500">
              * サブスクリプションはいつでもキャンセルできます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
