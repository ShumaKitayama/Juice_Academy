// MongoDB初期化スクリプト
// 本番環境用のデータベース初期設定

// juice_academyデータベースに切り替え
db = db.getSiblingDB('juice_academy');

print('=== Juice Academy データベース初期化開始 ===');

// インデックスの作成
print('インデックスを作成しています...');

// ユーザーコレクション
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "student_id": 1 }, { unique: true });
db.users.createIndex({ "created_at": -1 });
db.users.createIndex({ "role": 1 });

// お知らせコレクション
db.announcements.createIndex({ "created_at": -1 });
db.announcements.createIndex({ "is_published": 1 });
db.announcements.createIndex({ "title": "text", "content": "text" });

// 決済コレクション
db.payments.createIndex({ "user_id": 1 });
db.payments.createIndex({ "stripe_payment_intent_id": 1 }, { unique: true, sparse: true });
db.payments.createIndex({ "created_at": -1 });
db.payments.createIndex({ "status": 1 });

// サブスクリプションコレクション
db.subscriptions.createIndex({ "user_id": 1 });
db.subscriptions.createIndex({ "stripe_subscription_id": 1 }, { unique: true, sparse: true });
db.subscriptions.createIndex({ "status": 1 });
db.subscriptions.createIndex({ "created_at": -1 });

print('インデックス作成完了');

// データベースの設定
print('データベース設定を適用しています...');

// Write Concern設定（データの整合性を保証）
db.adminCommand({
    setDefaultRWConcern: 1,
    defaultReadConcern: { level: "majority" },
    defaultWriteConcern: { w: "majority", j: true, wtimeout: 30000 }
});

print('=== Juice Academy データベース初期化完了 ===');

// 初期化完了の確認
print('コレクション一覧:');
db.runCommand("listCollections").cursor.firstBatch.forEach(
    function(collection) {
        print('- ' + collection.name);
    }
);

print('初期化スクリプト実行完了');
