import React, { useEffect, useRef } from "react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2
            id="terms-modal-title"
            className="text-lg font-bold text-gray-900"
          >
            JUICE学園 利用規約
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500"
            aria-label="閉じる"
          >
            <svg
              className="size-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 本文 */}
        <div className="overflow-y-auto flex-1 px-6 py-5 text-sm text-gray-700 leading-relaxed space-y-4">
          <p>
            本利用規約（以下「本規約」といいます。）は、株式会社TRISONA（以下「当社」といいます。）が提供するサブスクリプション型ドリンクサービス「JUICE学園」（以下「本サービス」といいます。）の利用条件を定めるものです。本サービスを利用するすべての方（以下「利用者」といいます。）は、本規約に同意の上、本サービスを利用するものとします。
          </p>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第1章 総則</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第1条（目的）</h4>
            <p>本規約は、本サービスの提供条件および当社と利用者との間の権利義務関係を定めることを目的とします。</p>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第2条（定義）</h4>
            <p>本規約において使用する用語の定義は、以下のとおりとします。</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 pl-2">
              <li>「本サービス」とは、JUICE学園の名称で提供されるサブスクリプション型飲料提供サービスをいいます。</li>
              <li>「利用者」とは、本サービスを利用する個人をいいます。</li>
              <li>「会員」とは、所定の手続を経て当社との間で利用契約を締結した利用者をいいます。</li>
              <li>「契約」とは、本規約に基づき当社と利用者との間で成立する本サービスの利用契約をいいます。</li>
              <li>「設置場所」とは、本サービスが提供される施設、設備または拠点をいいます。</li>
              <li>「施設管理者」とは、本サービスが提供される施設を管理する大学その他の施設管理主体をいいます。</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第2章 会員登録・契約</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第3条（会員登録）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>本サービスを利用するためには、当社が定める方法に従い会員登録を行う必要があります。</li>
              <li>利用者は、本人確認サービス（TRUSTDOCK等）による本人認証を完了しなければなりません。</li>
              <li>利用者は、登録情報について正確かつ最新の情報を提供するものとします。</li>
              <li>未成年者が登録する場合は、保護者の同意を得たものとみなします。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第4条（契約の成立と期間）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>会員登録手続が完了した時点で、本サービスの利用契約が成立します。</li>
              <li>契約期間は1か月単位とし、解約手続がなされない限り自動更新されます。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第5条（登録情報の変更）</h4>
            <p>利用者は、登録情報に変更が生じた場合、速やかに当社所定の方法により変更手続きを行うものとします。</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第3章 利用料金・支払い</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第6条（利用料金）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>本サービスの利用料金は月額980円（税抜）とします。</li>
              <li>当社は、必要に応じて利用料金を変更することができるものとし、その場合は事前に通知します。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第7条（支払方法）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>利用料金は、クレジットカードその他当社が定める方法により支払うものとします。</li>
              <li>決済処理は外部決済事業者を通じて行われます。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第8条（返金）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>利用者都合による解約、未使用、利用機会の減少等を理由とした返金は行いません。</li>
              <li>設備故障、メンテナンス、混雑その他の理由により一時的に利用できない場合であっても、原則として返金は行いません。</li>
              <li>当社の責に帰すべき重大な事由がある場合には、当社の判断により対応を行います。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第9条（途中解約）</h4>
            <p>契約期間中に解約した場合であっても、日割り計算による返金は行いません。</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第4章 サービス内容および利用方法</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第10条（サービス内容）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>本サービスは、当社が指定する設置場所において、会員が飲料を利用できるサービスです。</li>
              <li>本サービスは、大学その他の施設管理者が管理する施設内において提供される場合がありますが、本サービスの運営および管理責任は当社に帰属するものとし、施設管理者は本サービスの運営主体または契約当事者となるものではありません。</li>
              <li>飲料の種類、提供方法、提供時間等は当社が定めるものとします。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第11条（利用方法）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>本サービスは、本人認証を完了した会員本人のみが利用できます。</li>
              <li>利用権の第三者への譲渡、貸与、共有は禁止します。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第12条（持ち帰り）</h4>
            <p>飲料の持ち帰りは可能としますが、常識的な範囲での利用を前提とし、営利目的での利用は禁止します。</p>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第13条（利用制限）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>本サービスの提供時間は、当社が定める時間帯に限られます。</li>
              <li>当社は、夜間、混雑時、設備保守、施設管理者による施設利用制限、災害その他運営上必要がある場合には、事前の通知なくサービスの全部または一部の提供を停止または制限することがあります。</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第5章 禁止事項および違反対応</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第14条（禁止事項）</h4>
            <p>利用者は、以下の行為を行ってはなりません。</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 pl-2">
              <li>本人以外による本サービスの利用</li>
              <li>本人認証後に第三者へ飲料を提供する行為</li>
              <li>提供飲料の譲渡、販売、または営利目的での利用</li>
              <li>設備への異物投入、改変、破損、汚損または不正操作</li>
              <li>紙コップその他備品の大量持ち出し</li>
              <li>他の利用者の利用を妨げる行為</li>
              <li>法令または公序良俗に反する行為</li>
              <li>その他当社が不適切と判断する行為</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第15条（違反時の措置）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>利用者が前条に違反した場合、当社は事前通知なくサービス利用停止、契約解除等の措置を講じることができます。</li>
              <li>この場合、利用料金の返金は行いません。</li>
              <li>利用者の行為により当社または第三者に損害が生じた場合、当社は当該利用者に対し損害賠償を請求できるものとします。</li>
              <li>故意または悪質な行為（設備破壊、異物混入等）が確認された場合、当社は関係機関への通報その他必要な法的措置を講じることがあります。</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第6章 契約解除・退会</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第16条（退会）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>利用者は当社所定の方法によりいつでも退会することができます。</li>
              <li>退会後は本サービスを利用する権利を失います。</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第17条（当社による解除）</h4>
            <p>利用者が本規約に違反した場合、当社は事前通知なく契約を解除することができます。</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第7章 個人情報の取扱い</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第18条（個人情報の取得）</h4>
            <p>当社は、本サービスの提供にあたり、氏名、学籍情報、連絡先、本人認証情報、利用履歴等を取得する場合があります。</p>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第19条（利用目的）</h4>
            <p>取得した個人情報は、以下の目的で利用します。</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 pl-2">
              <li>本サービスの提供および運営</li>
              <li>本人確認および不正利用防止</li>
              <li>サービス改善および統計分析</li>
              <li>広告営業・マーケティング分析（個人を特定しない形に限る）</li>
              <li>法令に基づく対応</li>
            </ol>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第20条（第三者提供）</h4>
            <p>当社は、法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。ただし、業務委託先には必要最小限の範囲で提供する場合があります。</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第8章 免責事項</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第21条（免責）</h4>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>当社は、故意または重大な過失がない限り、本サービス利用により生じた損害について責任を負いません。</li>
              <li>飲料の利用に関する体質・健康状態・アレルギー等については、利用者自身の責任において管理するものとします。</li>
              <li>利用者間のトラブルについて、当社は関与しません。</li>
              <li>本サービスは施設管理者の管理する施設内で提供される場合がありますが、本サービスの提供および運営に関する責任は当社に帰属するものとし、施設管理者は本サービスに起因する損害について責任を負うものではありません。</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第9章 サービス変更等</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第22条（サービス変更・中断・終了）</h4>
            <p>当社は、設備保守、災害、施設管理者による施設利用制限、事故・トラブル対応その他の理由により、本サービスの全部または一部を変更、中断または終了することがあります。</p>
            <p className="mt-2">また、異物混入、設備故障、体調不良その他の事故またはトラブルが発生した場合には、当社が一次対応を行うとともに、必要に応じて施設管理者へ情報共有を行うものとします。</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第10章 準拠法および管轄</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第23条（準拠法）</h4>
            <p>本規約は日本法を準拠法とします。</p>

            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第24条（管轄）</h4>
            <p>本サービスに関して紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mt-5 mb-2">第11章 附則</h3>
            <h4 className="font-semibold text-gray-800 mt-3 mb-1">第25条（規約の変更）</h4>
            <p>当社は、本規約を変更することができるものとし、変更後の内容は当社が定める方法により通知します。</p>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
              <p>本規約は、2026年4月1日より施行します。</p>
              <p className="font-medium mt-2">株式会社TRISONA</p>
              <p>所在地：〒160-0023 東京都新宿区西新宿3丁目3番13号 西新宿水間ビル2F</p>
              <p>連絡先：trisona.uni@gmail.com</p>
            </div>
          </section>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-juice-orange-500 hover:bg-juice-orange-600 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
