import React, { useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";
import { paymentAPI } from "../services/api";

const PromotionCode: React.FC = () => {
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApplyPromotionCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await paymentAPI.applyPromotionCode(promoCode);
      setSuccess("クーポンが適用されました。次回の請求から割引が反映されます。");
      setPromoCode("");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const errorWithResponse = err as {
          response?: { data?: { error?: string } };
        };
        setError(
          errorWithResponse.response?.data?.error ||
            "クーポンの適用に失敗しました"
        );
      } else {
        setError("クーポンの適用に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 px-2">
          プロモーションコード
        </h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 px-2">
          クーポンコードを入力して割引を適用できます
        </p>
      </div>

      <Card padding="large" className="animate-slide-up p-4 sm:p-6">
        {error && <ErrorAlert message={error} className="mb-4 sm:mb-6" />}
        {success && (
          <SuccessAlert title="成功" message={success} className="mb-4 sm:mb-6" />
        )}

        <form onSubmit={handleApplyPromotionCode} className="space-y-4 sm:space-y-6">
          <div>
            <label
              htmlFor="promo-code"
              className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2"
            >
              クーポンコード
            </label>
            <input
              id="promo-code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="例: WELCOME2024"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 sm:p-3 border"
              disabled={loading}
            />
          </div>

          <div className="flex justify-center sm:justify-end">
            <Button
              type="submit"
              variant="primary"
              size="medium"
              isLoading={loading}
              disabled={!promoCode.trim()}
              className="w-full sm:w-auto text-sm"
            >
              適用する
            </Button>
          </div>
        </form>

        <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500 bg-gray-50 p-3 sm:p-4 rounded-md">
          <h4 className="font-semibold mb-2">ご注意</h4>
          <ul className="list-disc pl-4 sm:pl-5 space-y-1">
            <li>次回の請求から適用されます。</li>
            <li>一度に適用できるクーポンは1つのみです。</li>
            <li>有効期限切れのクーポンは使用できません。</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default PromotionCode;

