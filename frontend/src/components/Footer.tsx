import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4 text-gray-800">Juice Academy</h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              ジュースがくえん ー学校にドリンクバーを設置するためのサービスー
            </p>
          </div>
          
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4 text-gray-800">リンク</h3>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
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
            </ul>
          </div>
          
          <div className="text-center sm:text-left sm:col-span-2 md:col-span-1">
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4 text-gray-800">お問い合わせ</h3>
            <address className="text-gray-600 text-xs sm:text-sm not-italic">
              <p>〒123-4567</p>
              <p>東京都渋谷区渋谷1-1-1</p>
              <p>Juice Academy ビル</p>
              <p className="mt-2">Email: info@juiceacademy.jp</p>
              <p>Tel: 03-1234-5678</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Juice Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 