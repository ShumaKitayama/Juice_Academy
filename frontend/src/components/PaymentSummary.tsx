import React from "react";
import Card from "./Card";

interface PaymentSummaryProps {
  planName: string;
  planPrice: number;
  billingPeriod: string;
  nextBillingDate?: string;
  discount?: number;
  tax?: number;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  planName,
  planPrice,
  billingPeriod,
  nextBillingDate,
  discount = 0,
  tax = 0,
}) => {
  // 税込み金額を計算
  const taxAmount = planPrice * (tax / 100);
  const discountAmount = planPrice * (discount / 100);
  const totalAmount = planPrice + taxAmount - discountAmount;

  // 金額をフォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  return (
    <Card title="お支払い情報" className="mb-6 card-hover">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">プラン</span>
          <span className="font-medium">{planName}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">料金</span>
          <span className="font-medium">{formatCurrency(planPrice)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <span>割引</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">消費税（{tax}%）</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
          <span className="font-semibold">合計</span>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>お支払い周期</span>
          <span>{billingPeriod}</span>
        </div>

        {nextBillingDate && (
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>次回請求日</span>
            <span>{nextBillingDate}</span>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-md text-sm text-blue-700 border border-blue-100">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-blue-500 mr-2 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p>
              サブスクリプションはいつでも解約できます。解約した場合、次回の請求日以降は料金が発生しません。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="flex space-x-4">
          <svg
            className="h-8 w-12"
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#1434CB" />
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontFamily="Arial"
              fontSize="10"
              fontWeight="bold"
            >
              VISA
            </text>
          </svg>
          <svg
            className="h-8 w-12"
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#EB001B" />
            <circle cx="18" cy="16" r="8" fill="#EB001B" />
            <circle cx="30" cy="16" r="8" fill="#F79E1B" />
          </svg>
          <svg
            className="h-8 w-12"
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#006FCF" />
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              fontFamily="Arial"
              fontSize="8"
              fontWeight="bold"
            >
              AMEX
            </text>
          </svg>
        </div>
      </div>
    </Card>
  );
};

export default PaymentSummary;
