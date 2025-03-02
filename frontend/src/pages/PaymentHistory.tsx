import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentAPI } from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created: number;
  description: string;
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
        setPayments(response.data);
        setError(null);
      } catch (err) {
        console.error('支払い履歴の取得に失敗しました:', err);
        setError('支払い履歴の取得中にエラーが発生しました。後でもう一度お試しください。');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [user]);

  // 日付をフォーマットする関数
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 金額をフォーマットする関数
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  // 支払いステータスを日本語に変換する関数
  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      succeeded: '成功',
      pending: '処理中',
      failed: '失敗',
    };
    return statusMap[status] || status;
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner message="支払い履歴を読み込み中..." />;
    }

    if (error) {
      return <ErrorAlert message={error} />;
    }

    if (payments.length === 0) {
      return <p className="text-sm text-gray-500 text-center">支払い履歴はありません。</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日付
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                説明
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(payment.created)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatAmount(payment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
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
        <Card
          title="支払い履歴"
          subtitle="これまでの支払い記録と詳細"
        >
          {renderContent()}
        </Card>
      </div>
    </div>
  );
};

export default PaymentHistory; 