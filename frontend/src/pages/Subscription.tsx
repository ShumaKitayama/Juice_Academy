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

// サブスクリプションプラン
const subscriptionPlans = [
  {
    id: import.meta.env.VITE_STRIPE_PRODUCT_ID, // 環境変数から商品IDを取得
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID, // 環境変数からpriceIDを取得
    name: "juice学園",
    price: 3000,
    description: "ドリンク飲み放題",
    features: ["ドリンクサーバーの利用が可能"],
    color: "orange",
  },
];

const Subscription: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // 選択されたプランの情報を取得
  const getSelectedPlanInfo = () => {
    return subscriptionPlans.find((plan) => plan.id === selectedPlan);
  };

  // 次回請求日を計算（現在から1ヶ月後）
  const getNextBillingDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
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

    setLoading(true);
    setError(null);

    try {
      const selectedPlanInfo = getSelectedPlanInfo();
      if (!selectedPlanInfo) {
        throw new Error("プラン情報が見つかりません");
      }

      // サブスクリプションを作成（既存のカード情報を使用）
      const response = await paymentAPI.createSubscription(
        user.id,
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            サブスクリプションプラン
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            あなたに最適なプランを選択してください
          </p>
        </div>

        {error && <ErrorAlert message={error} className="animate-slide-up" />}

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-1 sm:gap-6 lg:max-w-4xl lg:mx-auto">
          {subscriptionPlans.map((plan, index) => (
            <div key={index} className="subscription-option">
              <Card
                className={`divide-y divide-gray-200 plan-card animate-slide-up ${
                  plan.id === "prod_Rq1DHH7IbFPodY"
                    ? `border-2 border-${plan.color}-500 relative`
                    : ""
                } ${selectedPlan === plan.id ? "selected" : ""}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {plan.id === "prod_Rq1DHH7IbFPodY" && (
                  <div
                    className={`absolute top-0 right-0 -mt-4 -mr-4 bg-${plan.color}-500 rounded-full px-3 py-1 text-white text-xs font-semibold transform rotate-3`}
                  >
                    おすすめ
                  </div>
                )}
                <div className="p-6">
                  <h2
                    className={`text-lg leading-6 font-medium text-${plan.color}-700`}
                  >
                    {plan.name}
                  </h2>
                  <p className="mt-4 text-sm text-gray-500">
                    {plan.description}
                  </p>
                  <p className="mt-8">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ¥{plan.price.toLocaleString()}
                    </span>
                    <span className="text-base font-medium text-gray-500">
                      /月
                    </span>
                  </p>
                  <Button
                    type="button"
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={selectedPlan === plan.id ? "primary" : "outline"}
                    fullWidth
                    className={`mt-8 btn-hover-effect ${
                      selectedPlan === plan.id
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                        : ""
                    }`}
                  >
                    {selectedPlan === plan.id ? "選択中" : "選択する"}
                  </Button>
                </div>
                <div className="pt-6 pb-8 px-6">
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
              billingPeriod="月額"
              nextBillingDate={getNextBillingDate()}
              tax={10}
            />
          </div>
        )}

        <div className="mt-10 text-center">
          <Button
            onClick={handleSubscribe}
            variant="primary"
            size="large"
            isLoading={loading}
            disabled={!selectedPlan || loading}
            className="px-8 btn-hover-effect bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            サブスクリプションを開始する
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            * サブスクリプションはいつでもキャンセルできます
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
