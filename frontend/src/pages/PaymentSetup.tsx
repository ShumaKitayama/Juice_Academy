import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StripePaymentForm from '../components/StripePaymentForm';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import SuccessAlert from '../components/SuccessAlert';

const PaymentSetup: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // 既存の支払い方法を確認
  useEffect(() => {
    const checkExistingPaymentMethods = async () => {
      if (!user) return;

      try {
        const response = await paymentAPI.getPaymentMethods();
        if (response.data.paymentMethods && response.data.paymentMethods.length > 0) {
          // 既に支払い方法が登録されている場合は支払い方法管理ページにリダイレクト
          navigate('/payment-method');
        }
      } catch (err) {
        // エラーが発生しても続行（支払い方法がない可能性）
        console.error('支払い方法の確認中にエラーが発生しました:', err);
      }
    };

    checkExistingPaymentMethods();
  }, [user, navigate]);

  // Stripe顧客情報を作成
  useEffect(() => {
    const createStripeCustomer = async () => {
      if (!user) return;

      try {
        setLoading(true);
        await paymentAPI.createStripeCustomer();
        setHasStripeCustomer(true);
      } catch (err: any) {
        // 既に顧客情報が存在する場合はエラーにしない
        if (err.response?.data?.message?.includes('既に支払い情報が登録されています')) {
          setHasStripeCustomer(true);
        } else {
          setError(err.response?.data?.error || 'Stripe顧客情報の作成に失敗しました');
        }
      } finally {
        setLoading(false);
      }
    };

    createStripeCustomer();
  }, [user]);

  // 支払い方法登録成功時の処理
  const handlePaymentMethodSuccess = () => {
    setSuccess(true);
    // サブスクリプション登録ページに遷移
    setTimeout(() => {
      navigate('/subscription');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-fade-in">
          <LoadingSpinner size="large" message="決済情報を準備しています..." />
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
            決済情報の登録
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            サービスを利用するには、クレジットカード情報の登録が必要です。
          </p>
        </div>

        {error && <ErrorAlert message={error} className="animate-slide-up" />}
        {success && <SuccessAlert message="カード情報が正常に登録されました。サブスクリプションページに移動します。" className="animate-slide-up" />}

        {hasStripeCustomer ? (
          <div className="animate-slide-up">
            <StripePaymentForm onSuccess={handlePaymentMethodSuccess} />
          </div>
        ) : (
          <Card className="animate-slide-up">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
              <p className="font-bold">エラー</p>
              <p className="block sm:inline">Stripe顧客情報の作成に失敗しました。再度お試しください。</p>
            </div>
          </Card>
        )}

        <Card className="mt-8 card-hover animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">安全なお支払い</h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-sm">
                当サイトでは、クレジットカード情報を直接保存せず、Stripeの安全な決済システムを利用しています。
                カード情報はStripeのセキュアな環境で管理され、PCI DSSに準拠した高度なセキュリティ対策が施されています。
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-sm">
                登録されたカード情報は、今後の定期支払いに使用されます。
                いつでもマイページから支払い方法の変更や解約が可能です。
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-center space-x-6">
              <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-design-system/assets/img/logos/visa.png" alt="visa" className="h-8" />
              <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-design-system/assets/img/logos/mastercard.png" alt="mastercard" className="h-8" />
              <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/soft-ui-design-system/assets/img/logos/amex.png" alt="amex" className="h-8" />
            </div>
            <p className="text-center text-xs text-gray-500 mt-4">
              主要なクレジットカードがご利用いただけます
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSetup; 