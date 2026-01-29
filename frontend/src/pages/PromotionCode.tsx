import React, { useState } from "react";
import Button from "../components/Button";
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
      setSuccess(
        "クーポンが適用されました。次回の請求から割引が反映されます。",
      );
      setPromoCode("");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const errorWithResponse = err as {
          response?: { data?: { error?: string } };
        };
        setError(
          errorWithResponse.response?.data?.error ||
            "クーポンの適用に失敗しました",
        );
      } else {
        setError("クーポンの適用に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-left">
      <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3">
        クーポン
      </h2>

      <div>
        {error && <ErrorAlert message={error} className="mb-3" />}
        {success && (
          <SuccessAlert title="成功" message={success} className="mb-3" />
        )}

        <form onSubmit={handleApplyPromotionCode} className="space-y-3">
          <div>
            <label
              htmlFor="promo-code"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              クーポンコード
            </label>
            <input
              id="promo-code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="例: WELCOME2024"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="small"
            isLoading={loading}
            disabled={!promoCode.trim()}
            className="text-xs sm:text-sm"
          >
            適用
          </Button>
        </form>

        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-md">
          <p className="font-medium mb-1">ご注意</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>次回の請求から適用</li>
            <li>1つのみ適用可能</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PromotionCode;
