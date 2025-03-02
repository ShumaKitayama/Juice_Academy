import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import SuccessAlert from '../components/SuccessAlert';
import PaymentSummary from '../components/PaymentSummary';

// サブスクリプションプラン
const subscriptionPlans = [
  {
    id: 'price_basic',
    name: 'ベーシックプラン',
    price: 1980,
    description: '基本的な機能が利用できるプラン',
    features: [
      '基本的な学習コンテンツへのアクセス',
      '月1回のオンラインセミナー参加',
      'コミュニティフォーラムへのアクセス',
    ],
    color: 'blue',
  },
  {
    id: 'price_premium',
    name: 'プレミアムプラン',
    price: 3980,
    description: '全ての機能が利用できる上位プラン',
    features: [
      '全ての学習コンテンツへのアクセス',
      '月4回のオンラインセミナー参加',
      'コミュニティフォーラムへのアクセス',
      '専属メンターによるサポート',
      '課題の個別フィードバック',
    ],
    recommended: true,
    color: 'indigo',
  },
];

const Subscription: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // 選択されたプランの情報を取得
  const getSelectedPlanInfo = () => {
    return subscriptionPlans.find(plan => plan.id === selectedPlan);
  };

  // 次回請求日を計算（現在から1ヶ月後）
  const getNextBillingDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      await paymentAPI.createSubscription(user.id, selectedPlan);
      setSuccess(true);
      
      // 登録成功後、3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'サブスクリプションの登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 animate-fade-in">
          <SuccessAlert 
            title="登録完了" 
            message="サブスクリプションが正常に登録されました。ダッシュボードに移動します。" 
            className="animate-slide-up"
          />
          <div className="text-center">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="primary"
              size="medium"
              className="btn-hover-effect"
            >
              ダッシュボードへ
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto">
          {subscriptionPlans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`divide-y divide-gray-200 plan-card animate-slide-up ${
                plan.recommended ? `border-2 border-${plan.color}-500 relative` : ''
              } ${selectedPlan === plan.id ? 'selected' : ''}`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.recommended && (
                <div className={`absolute top-0 right-0 -mt-4 -mr-4 bg-${plan.color}-500 rounded-full px-3 py-1 text-white text-xs font-semibold transform rotate-3`}>
                  おすすめ
                </div>
              )}
              <div className="p-6">
                <h2 className={`text-lg leading-6 font-medium text-${plan.color}-700`}>{plan.name}</h2>
                <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">¥{plan.price.toLocaleString()}</span>
                  <span className="text-base font-medium text-gray-500">/月</span>
                </p>
                <Button
                  type="button"
                  onClick={() => handlePlanSelect(plan.id)}
                  variant={selectedPlan === plan.id ? "primary" : "outline"}
                  fullWidth
                  className={`mt-8 btn-hover-effect ${selectedPlan === plan.id ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : ''}`}
                >
                  {selectedPlan === plan.id ? '選択中' : '選択する'}
                </Button>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">含まれる機能</h3>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className={`flex-shrink-0 h-5 w-5 text-${plan.color}-500 mt-0.5`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
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