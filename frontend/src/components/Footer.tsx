import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const linkStyles =
    "text-gray-600 hover:text-juice-orange-500 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2 rounded hover:underline underline-offset-2";

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 sm:py-10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start mb-3">
              <div className="size-8 bg-juice-orange-500 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                <span className="text-white font-bold text-sm">J</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight">
                Juice Academy
              </h3>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm text-pretty leading-relaxed">
              ジュースがくえん ー学校にドリンクバーを設置するためのサービスー
            </p>
          </div>

          <div className="text-center sm:text-left">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-gray-800 tracking-tight uppercase">
              リンク
            </h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link to="/" className={linkStyles}>
                  トップページ
                </Link>
              </li>
              <li>
                <Link to="/mypage" className={linkStyles}>
                  マイページ
                </Link>
              </li>
              <li>
                <Link to="/mypage/subscription" className={linkStyles}>
                  サブスクリプション
                </Link>
              </li>
              <li>
                <Link to="/mypage/payment-history" className={linkStyles}>
                  支払い履歴
                </Link>
              </li>
            </ul>
          </div>

          <div className="text-center sm:text-left sm:col-span-2 md:col-span-1">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-gray-800 tracking-tight uppercase">
              お問い合わせ
            </h3>
            <address className="text-gray-600 text-xs sm:text-sm not-italic leading-relaxed">
              <p>〒123-4567</p>
              <p>東京都渋谷区渋谷1-1-1</p>
              <p>Juice Academy ビル</p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p>
                  Email:{" "}
                  <a href="mailto:info@juiceacademy.jp" className={linkStyles}>
                    info@juiceacademy.jp
                  </a>
                </p>
                <p className="mt-1">
                  Tel:{" "}
                  <a href="tel:03-1234-5678" className={linkStyles}>
                    03-1234-5678
                  </a>
                </p>
              </div>
            </address>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 sm:mt-10 pt-5 sm:pt-6 text-center text-xs sm:text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Juice Academy. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
