import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import SuccessAlert from "../components/SuccessAlert";
import { paymentAPI } from "../services/api";

// サブスクリプション情報の型定義
interface Subscription {
  id: string;
  status: string;
  price_id: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const SubscriptionManagement: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // MyPage内で表示されているかどうかを判定
  const isInMyPage = location.pathname.startsWith("/mypage");

  // サブスクリプション情報を取得
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await paymentAPI.getSubscriptionStatus();
        setSubscription(response.data.subscription);
      } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "response" in err) {
          const errorWithResponse = err as {
            response?: { data?: { error?: string } };
          };
          setError(
            errorWithResponse.response?.data?.error ||
              "サブスクリプション情報の取得に失敗しました",
          );
        } else {
          setError("サブスクリプション情報の取得に失敗しました");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  // サブスクリプションのステータスを日本語に変換
  const getStatusText = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return "次回更新時に終了予定";
    }

    switch (status) {
      case "active":
        return "有効";
      case "canceled":
        return "キャンセル済み";
      case "incomplete":
        return "未完了";
      case "incomplete_expired":
        return "期限切れ";
      case "past_due":
        return "支払い遅延";
      case "trialing":
        return "トライアル中";
      case "unpaid":
        return "未払い";
      default:
        return status;
    }
  };

  // 次回請求日をフォーマット
  const formatNextBillingDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // サブスクリプションをキャンセル
  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        "サブスクリプションをキャンセルしますか？次回更新時に終了します。",
      )
    ) {
      return;
    }

    setCancelLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await paymentAPI.cancelSubscription();
      setSuccess("サブスクリプションは次回更新時にキャンセルされます");

      // サブスクリプション情報を更新
      if (subscription) {
        setSubscription({
          ...subscription,
          cancel_at_period_end: true,
        });
      }
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const errorWithResponse = err as {
          response?: { data?: { error?: string } };
        };
        setError(
          errorWithResponse.response?.data?.error ||
            "サブスクリプションのキャンセルに失敗しました",
        );
      } else {
        setError("サブスクリプションのキャンセルに失敗しました");
      }
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    // MyPage内の場合はシンプルなローディング
    if (isInMyPage) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <LoadingSpinner size="medium" />
            <p className="mt-4 text-sm sm:text-base text-gray-600">
              サブスクリプション情報を読み込み中...
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-lg text-gray-600">
            サブスクリプション情報を読み込み中...
          </p>
        </div>
      </div>
    );
  }

  // ステータスの視覚的スタイル（3パターン）
  const getStatusStyle = (status: string, cancelAtPeriodEnd: boolean) => {
    // 解約済み（次回更新日まで利用可）
    if (cancelAtPeriodEnd) {
      return {
        border: "border-l-4 border-l-amber-400 bg-amber-50",
        badge: "bg-amber-100 text-amber-800",
        icon: "⏳",
        label: "解約予定",
      };
    }
    // 有効
    if (status === "active") {
      return {
        border: "border-l-4 border-l-green-500 bg-green-50",
        badge: "bg-green-100 text-green-800",
        icon: "✓",
        label: "有効",
      };
    }
    // 支払い遅延
    if (status === "past_due") {
      return {
        border: "border-l-4 border-l-red-500 bg-red-50",
        badge: "bg-red-100 text-red-800",
        icon: "!",
        label: "支払い遅延",
      };
    }
    // 無効
    return {
      border: "border-l-4 border-l-gray-400 bg-gray-50",
      badge: "bg-gray-100 text-gray-700",
      icon: "−",
      label: "無効",
    };
  };

  // サブスクリプション情報のコンテンツ部分
  const subscriptionContent = (
    <>
      {error && <ErrorAlert message={error} className="mb-3" />}
      {success && (
        <SuccessAlert title="成功" message={success} className="mb-3" />
      )}

      {subscription ? (
        (() => {
          const style = getStatusStyle(
            subscription.status,
            subscription.cancel_at_period_end,
          );
          return (
            <div className={isInMyPage ? "" : "bg-white rounded-lg shadow p-5"}>
              {/* ステータスカード */}
              <div className={`rounded-lg p-4 mb-4 ${style.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-bold ${style.badge}`}
                    >
                      {style.icon}
                    </span>
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {style.label}
                      </p>
                      {subscription.cancel_at_period_end && (
                        <p className="text-sm text-amber-700">
                          更新日まで利用可能
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">次回請求日</p>
                    <p className="text-lg font-medium text-gray-900">
                      {formatNextBillingDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    navigate(
                      isInMyPage
                        ? "/mypage/payment-history"
                        : "/payment/history",
                    )
                  }
                  className="px-6 py-3 text-base font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  履歴
                </button>
                {subscription.status === "active" &&
                  !subscription.cancel_at_period_end && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="px-6 py-3 text-base font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {cancelLoading ? "処理中..." : "解約"}
                    </button>
                  )}
              </div>
            </div>
          );
        })()
      ) : (
        <div className={isInMyPage ? "py-4" : "p-5 bg-white rounded-lg shadow"}>
          <p className="text-lg text-gray-500 mb-4">現在契約がありません</p>
          <button
            onClick={() => navigate("/subscription")}
            className="px-6 py-3 text-base font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
          >
            契約する
          </button>
        </div>
      )}
    </>
  );

  // MyPage内の場合はシンプルなレイアウト
  if (isInMyPage) {
    return (
      <div className="text-left">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3">
          サブスクリプション
        </h2>
        {subscriptionContent}
      </div>
    );
  }

  // 独立ページの場合はフルレイアウト
  return (
    <div className="min-h-screen bg-gray-50 py-2 sm:py-4 px-2 sm:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 px-2">
            サブスクリプション管理
          </h1>
          <p className="mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base md:text-xl text-gray-500 px-2">
            現在のサブスクリプション状況を確認できます
          </p>
        </div>
        {subscriptionContent}
      </div>
    </div>
  );
};

export default SubscriptionManagement;
