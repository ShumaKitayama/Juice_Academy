import React, { useEffect, useState } from "react";
import Card from "../components/Card";
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
          "支払い履歴の取得中にエラーが発生しました。後でもう一度お試しください。"
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                日付
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                説明
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                金額
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ステータス
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className={payment.status === "upcoming" ? "bg-blue-50" : ""}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(payment.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.description ||
                    (payment.type === "subscription"
                      ? "サブスクリプション料金"
                      : "支払い")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatAmount(payment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(
                      payment.status
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
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card title="支払い履歴" subtitle="これまでの支払い記録と詳細">
          {renderContent()}
        </Card>
      </div>
    </div>
  );
};

export default PaymentHistory;
