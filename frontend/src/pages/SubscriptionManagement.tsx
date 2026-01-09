import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
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
              "サブスクリプション情報の取得に失敗しました"
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
        "サブスクリプションをキャンセルしますか？次回更新時に終了します。"
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
            "サブスクリプションのキャンセルに失敗しました"
        );
      } else {
        setError("サブスクリプションのキャンセルに失敗しました");
      }
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 px-2">
            サブスクリプション管理
          </h1>
          <p className="mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base md:text-xl text-gray-500 px-2">
            現在のサブスクリプション状況を確認できます
          </p>
        </div>

        {error && (
          <ErrorAlert message={error} className="animate-slide-up mb-6" />
        )}
        {success && (
          <SuccessAlert
            title="成功"
            message={success}
            className="animate-slide-up mb-6"
          />
        )}

        {subscription ? (
          <Card className="divide-y divide-gray-200 animate-slide-up">
            <div className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                サブスクリプション情報
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    ステータス
                  </p>
                  <p className="mt-1 text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                    {getStatusText(
                      subscription.status,
                      subscription.cancel_at_period_end
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    次回請求日
                  </p>
                  <p className="mt-1 text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                    {formatNextBillingDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>

              {subscription.status === "active" &&
                !subscription.cancel_at_period_end && (
                  <div className="mt-6 sm:mt-8">
                    <Button
                      onClick={handleCancelSubscription}
                      variant="danger"
                      size="medium"
                      isLoading={cancelLoading}
                      className="btn-hover-effect w-full sm:w-auto text-sm"
                    >
                      サブスクリプションをキャンセル
                    </Button>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500">
                      * キャンセルしても次回更新日まではサービスを利用できます
                    </p>
                  </div>
                )}
            </div>

            <div className="p-4 sm:p-6">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                決済履歴
              </h3>
              <Button
                onClick={() => navigate("/payment/history")}
                variant="outline"
                size="small"
                className="btn-hover-effect w-full sm:w-auto text-sm"
              >
                決済履歴を表示
              </Button>
            </div>
          </Card>
        ) : (
          <div className="text-center p-4 sm:p-8 bg-white rounded-lg shadow animate-slide-up">
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-6">
              現在アクティブなサブスクリプションはありません
            </p>
            <Button
              onClick={() => navigate("/subscription")}
              variant="primary"
              size="medium"
              className="btn-hover-effect bg-gradient-to-r from-blue-500 to-indigo-600 w-full sm:w-auto text-sm"
            >
              サブスクリプションを開始する
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManagement;
