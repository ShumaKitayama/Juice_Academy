import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">プロフィール情報</h2>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">氏名</p>
              <p className="mt-1 text-gray-900">{user?.name || '未設定'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">氏名（カナ）</p>
              <p className="mt-1 text-gray-900">{user?.nameKana || '未設定'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">メールアドレス</p>
              <p className="mt-1 text-gray-900">{user?.email || '未設定'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">電話番号</p>
              <p className="mt-1 text-gray-900">{user?.phone || '未設定'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">学校情報</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">学校名</p>
              <p className="mt-1 text-gray-900">{user?.schoolName || '未設定'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">役職</p>
              <p className="mt-1 text-gray-900">{user?.position || '未設定'}</p>
            </div>
            
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">学校住所</p>
              <p className="mt-1 text-gray-900">{user?.schoolAddress || '未設定'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-juice-orange-500 hover:bg-juice-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juice-orange-400"
          >
            プロフィールを編集
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile; 