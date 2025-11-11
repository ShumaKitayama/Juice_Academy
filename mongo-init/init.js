// MongoDB初期化スクリプト
// 本番環境用のデータベース初期設定

// juice_academyデータベースに切り替え
db = db.getSiblingDB("juice_academy");

print("=== Juice Academy データベース初期化開始 ===");

// インデックスの作成
print("インデックスを作成しています...");

// ユーザーコレクション
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ student_id: 1 }, { unique: true });
db.users.createIndex({ created_at: -1 });
db.users.createIndex({ role: 1 });

// お知らせコレクション
db.announcements.createIndex({ created_at: -1 });
db.announcements.createIndex({ is_published: 1 });
db.announcements.createIndex({ title: "text", content: "text" });

// 決済コレクション（セキュリティ強化版）
db.payments.createIndex({ user_id: 1 }, { unique: true }); // IDOR防止: 1ユーザー1決済情報
db.payments.createIndex(
  { stripe_customer_id: 1 },
  { unique: true, sparse: true }
); // 顧客ID重複防止
db.payments.createIndex(
  { stripe_payment_intent_id: 1 },
  { unique: true, sparse: true }
);
db.payments.createIndex({ created_at: -1 });
db.payments.createIndex({ status: 1 });

// サブスクリプションコレクション
db.subscriptions.createIndex({ user_id: 1 });
db.subscriptions.createIndex(
  { stripe_subscription_id: 1 },
  { unique: true, sparse: true }
);
db.subscriptions.createIndex({ status: 1 });
db.subscriptions.createIndex({ created_at: -1 });

// リフレッシュトークンコレクション
db.refresh_tokens.createIndex({ token_hash: 1 }, { unique: true });
db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
db.refresh_tokens.createIndex({ user_id: 1 });

// Webhook冪等性管理コレクション
db.stripe_events.createIndex({ event_id: 1 }, { unique: true });
db.stripe_events.createIndex({ received_at: -1 });
// 古いイベントを自動削除（30日後）
db.stripe_events.createIndex(
  { received_at: 1 },
  { expireAfterSeconds: 2592000 }
);

print("インデックス作成完了");

// データベースの設定
print("データベース設定を適用しています...");

// Write Concern設定（データの整合性を保証）
db.adminCommand({
  setDefaultRWConcern: 1,
  defaultReadConcern: { level: "majority" },
  defaultWriteConcern: { w: "majority", j: true, wtimeout: 30000 },
});

// アプリケーション用ユーザーの作成（最小権限の原則）
print("アプリケーション用ユーザーを作成しています...");

// 環境変数またはデフォルト値を使用
const appUsername = "juice_academy_app";
const appPassword =
  process.env.MONGO_APP_PASSWORD || "app_secure_password_change_in_production";

// 既存ユーザーを削除（再実行時のため）
try {
  db.dropUser(appUsername);
} catch (e) {
  print("既存ユーザーが見つかりません（新規作成します）");
}

// 最小権限ユーザーの作成（readWriteのみ）
db.createUser({
  user: appUsername,
  pwd: appPassword,
  roles: [
    {
      role: "readWrite",
      db: "juice_academy",
    },
  ],
});

print("アプリケーションユーザー作成完了: " + appUsername);
print("権限: readWrite on juice_academy");

print("=== Juice Academy データベース初期化完了 ===");

// 初期化完了の確認
print("コレクション一覧:");
db.runCommand("listCollections").cursor.firstBatch.forEach(function (
  collection
) {
  print("- " + collection.name);
});

print("初期化スクリプト実行完了");
