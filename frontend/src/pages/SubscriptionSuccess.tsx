import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import SuccessAlert from '../components/SuccessAlert';
import LoadingSpinner from '../components/LoadingSpinner';

const SubscriptionSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id'); // 後方互換性のため残しておく
  const navigate = useNavigate();

  useEffect(() => {
    // 3秒後に自動的にローディング状態を解除
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-lg text-gray-600">サブスクリプション情報を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            サブスクリプション登録完了
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            ありがとうございます！
          </p>
        </div>

        <SuccessAlert 
          title="登録完了" 
          message="サブスクリプションが正常に登録されました。ダッシュボードからコンテンツにアクセスできます。" 
          className="animate-slide-up"
        />

        <div className="mt-8 text-center">
          <Button
            onClick={handleGoToDashboard}
            variant="primary"
            size="large"
            className="px-8 btn-hover-effect bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            ダッシュボードへ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess; 