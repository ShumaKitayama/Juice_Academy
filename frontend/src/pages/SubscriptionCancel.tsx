import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/subscription');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            サブスクリプション登録がキャンセルされました
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            サブスクリプションの登録手続きはキャンセルされました。
          </p>
        </div>

        <ErrorAlert 
          message="サブスクリプションの登録手続きはキャンセルされました。いつでも再度お試しいただけます。" 
          className="animate-slide-up"
        />

        <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button
            onClick={handleGoBack}
            variant="primary"
            size="medium"
            className="btn-hover-effect bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            サブスクリプションに戻る
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            size="medium"
            className="btn-hover-effect"
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel; 