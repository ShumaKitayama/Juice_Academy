import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'ログインに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-juice-orange-400 to-juice-orange-600">
            Juice Academy
          </h1>
          <p className="mt-3 text-gray-600">
            学校にドリンクバーを設置するためのサービス
          </p>
        </div>
        
        <Card className="overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              アカウントにログイン
            </h2>
            
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md" role="alert">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-juice-orange-500 focus:border-juice-orange-500 sm:text-sm"
                  placeholder="example@juiceacademy.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-juice-orange-500 focus:border-juice-orange-500 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting ? 'bg-juice-orange-400' : 'bg-juice-orange-500 hover:bg-juice-orange-600'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-500 transition-colors duration-200`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </span>
                  ) : 'ログイン'}
                </button>
              </div>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">または</span>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  アカウントをお持ちでない方は
                  <Link to="/register" className="ml-1 font-medium text-juice-orange-600 hover:text-juice-orange-500">
                    新規登録
                  </Link>
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
            ログインすることで、利用規約とプライバシーポリシーに同意したことになります。
          </div>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Juice Academy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 