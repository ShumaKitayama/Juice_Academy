import React, { useEffect, useState } from "react";
import ErrorAlert from "../components/ErrorAlert";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { paymentAPI } from "../services/api";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  description: string;
  type?: string;
}

const PaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await paymentAPI.getPaymentHistory();
        setPayments(response.data.payment_history || []);
        setError(null);
      } catch {
        setError(
          "支払い履歴の取得中にエラーが発生しました。後でもう一度お試しください。",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [user]);

  // 日付をフォーマットする関数
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 金額をフォーマットする関数
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  // 支払いステータスを日本語に変換する関数
  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      success: "成功",
      pending: "処理中",
      failed: "失敗",
      upcoming: "予定",
    };
    return statusMap[status] || status;
  };

  // 支払いタイプに応じたスタイルを返す関数
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner message="支払い履歴を読み込み中..." />;
    }

    if (error) {
      return <ErrorAlert message={error} />;
    }

    if (payments.length === 0) {
      return (
        <p className="text-sm text-gray-500 text-center">
          支払い履歴はありません。
        </p>
      );
    }

    return (
      <>
        {/* モバイル用リスト表示 */}
        <div className="block sm:hidden divide-y divide-gray-100">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className={`py-3 flex items-center justify-between ${
                payment.status === "upcoming" ? "bg-blue-50 -mx-3 px-3" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      payment.status === "success"
                        ? "bg-green-500"
                        : payment.status === "upcoming"
                          ? "bg-blue-500"
                          : payment.status === "pending"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-500">
                    {formatDate(payment.created_at)}
                  </span>
                </div>
                <p className="text-base text-gray-800 mt-0.5">
                  {payment.description || "サブスクリプション"}
                </p>
              </div>
              <div className="text-right pl-3">
                <p className="text-base font-semibold text-gray-900">
                  {formatAmount(payment.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* デスクトップ用テーブル表示 */}
        <div className="hidden sm:block">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  日付
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  説明
                </th>
                <th
                  scope="col"
                  className="w-24 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                >
                  金額
                </th>
                <th
                  scope="col"
                  className="w-20 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  状態
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className={payment.status === "upcoming" ? "bg-blue-50" : ""}
                >
                  <td className="px-3 py-3 text-sm text-gray-500">
                    {formatDate(payment.created_at)}
                  </td>
                  <td
                    className="px-3 py-3 text-sm text-gray-900 truncate"
                    title={payment.description}
                  >
                    {payment.description ||
                      (payment.type === "subscription"
                        ? "サブスクリプション料金"
                        : "支払い")}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatAmount(payment.amount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusStyle(
                        payment.status,
                      )}`}
                    >
                      {translateStatus(payment.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="text-left">
      <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3">
        支払い履歴
      </h2>
      {renderContent()}
    </div>
  );
};

export default PaymentHistory;
