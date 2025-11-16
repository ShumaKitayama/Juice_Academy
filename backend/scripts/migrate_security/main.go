package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// マイグレーションスクリプト: 決済セキュリティ強化
// 既存データの整合性チェックと重複データの検出

func main() {
	fmt.Println("=== Juice Academy 決済セキュリティマイグレーション ===")
	fmt.Println("このスクリプトは既存データの整合性をチェックします")
	fmt.Println()

	// 環境変数の読み込み（プロジェクトルートの.envファイルを探す）
	envPaths := []string{
		".env",                    // カレントディレクトリ
		"../.env",                 // 1つ上のディレクトリ
		"../../.env",               // 2つ上のディレクトリ（backend/）
		"../../../.env",           // 3つ上のディレクトリ（プロジェクトルート）
	}
	
	envLoaded := false
	for _, envPath := range envPaths {
		if err := godotenv.Load(envPath); err == nil {
			envLoaded = true
			log.Printf("✓ .envファイルを読み込みました: %s", envPath)
			break
		}
	}
	
	if !envLoaded {
		log.Printf("警告: .envファイルが見つかりませんでした。環境変数が直接設定されていることを確認してください。")
	}

	// MongoDB接続
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/juice_academy"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("MongoDB接続失敗:", err)
	}
	defer client.Disconnect(ctx)

	// 接続確認
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("MongoDB Ping失敗:", err)
	}
	fmt.Println("✓ MongoDB接続成功")

	db := client.Database("juice_academy")
	paymentsCollection := db.Collection("payments")
	subscriptionsCollection := db.Collection("subscriptions")

	// 1. paymentsコレクションのチェック
	fmt.Println("\n--- paymentsコレクションのチェック ---")
	checkPaymentsDuplicates(ctx, paymentsCollection)

	// 2. subscriptionsコレクションのチェック
	fmt.Println("\n--- subscriptionsコレクションのチェック ---")
	checkSubscriptionsDuplicates(ctx, subscriptionsCollection)

	// 3. インデックスの作成（安全に）
	fmt.Println("\n--- インデックスの作成 ---")
	createIndexesSafely(ctx, db)

	fmt.Println("\n=== マイグレーション完了 ===")
	fmt.Println("重複データがある場合は、上記の指示に従って手動で修正してください")
}

// checkPaymentsDuplicates は payments コレクションの重複をチェック
func checkPaymentsDuplicates(ctx context.Context, collection *mongo.Collection) {
	// user_id の重複チェック
	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$user_id"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "docs", Value: bson.D{{Key: "$push", Value: "$$ROOT"}}},
		}}},
		{{Key: "$match", Value: bson.D{
			{Key: "count", Value: bson.D{{Key: "$gt", Value: 1}}},
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Printf("エラー: user_id 重複チェック失敗: %v", err)
		return
	}
	defer cursor.Close(ctx)

	hasDuplicates := false
	for cursor.Next(ctx) {
		var result struct {
			ID    primitive.ObjectID `bson:"_id"`
			Count int                `bson:"count"`
			Docs  []bson.M           `bson:"docs"`
		}
		if err := cursor.Decode(&result); err != nil {
			log.Printf("エラー: デコード失敗: %v", err)
			continue
		}

		hasDuplicates = true
		fmt.Printf("⚠ 警告: user_id %s に %d 件の重複があります\n", result.ID.Hex(), result.Count)
		for i, doc := range result.Docs {
			fmt.Printf("  [%d] _id: %s, stripe_customer_id: %s\n",
				i+1,
				doc["_id"].(primitive.ObjectID).Hex(),
				getStringField(doc, "stripe_customer_id"),
			)
		}
		fmt.Println("  → 対処: 正しいレコード以外を削除してください")
		fmt.Printf("     db.payments.deleteOne({_id: ObjectId('%s')})\n\n", result.Docs[1]["_id"].(primitive.ObjectID).Hex())
	}

	if !hasDuplicates {
		fmt.Println("✓ user_id に重複はありません")
	}

	// stripe_customer_id の重複チェック
	pipeline = mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "stripe_customer_id", Value: bson.D{{Key: "$ne", Value: ""}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$stripe_customer_id"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "docs", Value: bson.D{{Key: "$push", Value: "$$ROOT"}}},
		}}},
		{{Key: "$match", Value: bson.D{
			{Key: "count", Value: bson.D{{Key: "$gt", Value: 1}}},
		}}},
	}

	cursor, err = collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Printf("エラー: stripe_customer_id 重複チェック失敗: %v", err)
		return
	}
	defer cursor.Close(ctx)

	hasDuplicates = false
	for cursor.Next(ctx) {
		var result struct {
			ID    string   `bson:"_id"`
			Count int      `bson:"count"`
			Docs  []bson.M `bson:"docs"`
		}
		if err := cursor.Decode(&result); err != nil {
			log.Printf("エラー: デコード失敗: %v", err)
			continue
		}

		hasDuplicates = true
		fmt.Printf("⚠ 警告: stripe_customer_id %s に %d 件の重複があります\n", result.ID, result.Count)
		for i, doc := range result.Docs {
			fmt.Printf("  [%d] _id: %s, user_id: %s\n",
				i+1,
				doc["_id"].(primitive.ObjectID).Hex(),
				doc["user_id"].(primitive.ObjectID).Hex(),
			)
		}
		fmt.Println("  → 対処: 重複レコードを削除してください")
	}

	if !hasDuplicates {
		fmt.Println("✓ stripe_customer_id に重複はありません")
	}

	// 統計情報
	count, _ := collection.CountDocuments(ctx, bson.D{})
	fmt.Printf("\n合計レコード数: %d\n", count)
}

// checkSubscriptionsDuplicates は subscriptions コレクションの重複をチェック
func checkSubscriptionsDuplicates(ctx context.Context, collection *mongo.Collection) {
	// stripe_subscription_id の重複チェック
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{
			{Key: "stripe_subscription_id", Value: bson.D{{Key: "$ne", Value: ""}}},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$stripe_subscription_id"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "docs", Value: bson.D{{Key: "$push", Value: "$$ROOT"}}},
		}}},
		{{Key: "$match", Value: bson.D{
			{Key: "count", Value: bson.D{{Key: "$gt", Value: 1}}},
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Printf("エラー: stripe_subscription_id 重複チェック失敗: %v", err)
		return
	}
	defer cursor.Close(ctx)

	hasDuplicates := false
	for cursor.Next(ctx) {
		var result struct {
			ID    string   `bson:"_id"`
			Count int      `bson:"count"`
			Docs  []bson.M `bson:"docs"`
		}
		if err := cursor.Decode(&result); err != nil {
			log.Printf("エラー: デコード失敗: %v", err)
			continue
		}

		hasDuplicates = true
		fmt.Printf("⚠ 警告: stripe_subscription_id %s に %d 件の重複があります\n", result.ID, result.Count)
		for i, doc := range result.Docs {
			fmt.Printf("  [%d] _id: %s, user_id: %s, status: %s\n",
				i+1,
				doc["_id"].(primitive.ObjectID).Hex(),
				doc["user_id"].(primitive.ObjectID).Hex(),
				getStringField(doc, "status"),
			)
		}
		fmt.Println("  → 対処: 古いレコードを削除してください")
	}

	if !hasDuplicates {
		fmt.Println("✓ stripe_subscription_id に重複はありません")
	}

	// 統計情報
	count, _ := collection.CountDocuments(ctx, bson.D{})
	fmt.Printf("\n合計レコード数: %d\n", count)
}

// createIndexesSafely はインデックスを安全に作成
func createIndexesSafely(ctx context.Context, db *mongo.Database) {
	paymentsCollection := db.Collection("payments")
	subscriptionsCollection := db.Collection("subscriptions")
	stripeEventsCollection := db.Collection("stripe_events")

	// payments インデックス
	fmt.Println("\npaymentsコレクションのインデックスを作成中...")
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("user_id_unique"),
		},
		{
			Keys:    bson.D{{Key: "stripe_customer_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetSparse(true).SetName("stripe_customer_id_unique"),
		},
	}

	for _, index := range indexes {
		_, err := paymentsCollection.Indexes().CreateOne(ctx, index)
		if err != nil {
			fmt.Printf("⚠ インデックス作成失敗（既に存在する可能性）: %v\n", err)
		} else {
			fmt.Printf("✓ インデックス作成成功: %s\n", *index.Options.Name)
		}
	}

	// subscriptions インデックス
	fmt.Println("\nsubscriptionsコレクションのインデックスを作成中...")
	subIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "stripe_subscription_id", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true).SetName("stripe_subscription_id_unique"),
	}
	_, err := subscriptionsCollection.Indexes().CreateOne(ctx, subIndex)
	if err != nil {
		fmt.Printf("⚠ インデックス作成失敗（既に存在する可能性）: %v\n", err)
	} else {
		fmt.Println("✓ インデックス作成成功: stripe_subscription_id_unique")
	}

	// stripe_events インデックス
	fmt.Println("\nstripe_eventsコレクションのインデックスを作成中...")
	eventIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "event_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("event_id_unique"),
		},
		{
			Keys:    bson.D{{Key: "received_at", Value: -1}},
			Options: options.Index().SetName("received_at_desc"),
		},
		{
			Keys:    bson.D{{Key: "received_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(2592000).SetName("received_at_ttl"), // 30日後に自動削除
		},
	}

	for _, index := range eventIndexes {
		_, err := stripeEventsCollection.Indexes().CreateOne(ctx, index)
		if err != nil {
			fmt.Printf("⚠ インデックス作成失敗（既に存在する可能性）: %v\n", err)
		} else {
			fmt.Printf("✓ インデックス作成成功: %s\n", *index.Options.Name)
		}
	}
}

// getStringField は安全にstring型のフィールドを取得
func getStringField(doc bson.M, key string) string {
	if val, ok := doc[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

