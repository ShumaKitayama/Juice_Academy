import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Juice Academy</h3>
            <p className="text-gray-600 text-sm">
              ジュースがくえん ー学校にドリンクバーを設置するためのサービスー
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">リンク</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-600 hover:text-juice-orange-500">
                  トップページ
                </Link>
              </li>
              <li>
                <Link to="/mypage" className="text-gray-600 hover:text-juice-orange-500">
                  マイページ
                </Link>
              </li>
              <li>
                <Link to="/mypage/subscription" className="text-gray-600 hover:text-juice-orange-500">
                  サブスクリプション
                </Link>
              </li>
              <li>
                <Link to="/mypage/payment-history" className="text-gray-600 hover:text-juice-orange-500">
                  支払い履歴
                </Link>
              </li>
              <li>
                <Link to="/mypage/payment-method" className="text-gray-600 hover:text-juice-orange-500">
                  支払い方法管理
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">お問い合わせ</h3>
            <address className="text-gray-600 text-sm not-italic">
              <p>〒123-4567</p>
              <p>東京都渋谷区渋谷1-1-1</p>
              <p>Juice Academy ビル</p>
              <p className="mt-2">Email: info@juiceacademy.jp</p>
              <p>Tel: 03-1234-5678</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Juice Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 