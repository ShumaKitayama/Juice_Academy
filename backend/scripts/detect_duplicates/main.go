package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/customer"
	"github.com/stripe/stripe-go/v72/paymentmethod"
	subscriptionapi "github.com/stripe/stripe-go/v72/sub"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// 重複顧客検出スクリプト
// Stripe側で同じメールアドレスの顧客が複数存在する場合を検出

func main() {
	fmt.Println("=== Stripe重複顧客検出スクリプト ===")
	fmt.Println("このスクリプトはStripe側で重複している顧客を検出します")
	fmt.Println()

	// 環境変数の読み込み（プロジェクトルートの.envファイルを探す）
	// 現在のディレクトリから順に親ディレクトリを探す
	envPaths := []string{
		".env",          // カレントディレクトリ
		"../.env",       // 1つ上のディレクトリ
		"../../.env",    // 2つ上のディレクトリ（backend/）
		"../../../.env", // 3つ上のディレクトリ（プロジェクトルート）
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

	// Stripe APIキーの設定
	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	if stripeKey == "" {
		log.Fatal("エラー: STRIPE_SECRET_KEY環境変数が設定されていません")
	}
	stripe.Key = stripeKey

	// MongoDB接続
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/juice_academy"
	}

	// タイムアウトを5分に延長（Stripeから全顧客を取得する時間を考慮）
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
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
	usersCollection := db.Collection("users")

	// Stripeから全顧客を取得してメールアドレスでグループ化
	fmt.Println("\n--- Stripe顧客の取得と分析 ---")
	duplicateCustomers := findDuplicateCustomers(ctx)

	if len(duplicateCustomers) == 0 {
		fmt.Println("\n✓ 重複顧客は見つかりませんでした")
		return
	}

	fmt.Printf("\n⚠ 重複顧客が %d 件見つかりました\n", len(duplicateCustomers))

	// 各重複グループを分析
	for email, customers := range duplicateCustomers {
		fmt.Printf("\n--- メールアドレス: %s ---\n", email)
		fmt.Printf("顧客数: %d\n", len(customers))

		// MongoDBで対応するユーザーと支払い情報を確認
		var user bson.M
		err := usersCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
		if err != nil {
			fmt.Printf("⚠ 警告: MongoDBにユーザーが見つかりません (email: %s)\n", email)
			fmt.Printf("   → このメールアドレスのユーザーは削除された可能性があります\n")
		} else {
			// 安全な型アサーション
			userID, ok := user["_id"].(primitive.ObjectID)
			if !ok {
				fmt.Printf("⚠ エラー: ユーザーIDの型変換に失敗しました\n")
			} else {
				fmt.Printf("✓ MongoDBユーザーID: %s\n", userID.Hex())

				// 支払い情報を確認
				var payment bson.M
				err = paymentsCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
				if err != nil {
					fmt.Printf("⚠ 警告: MongoDBに支払い情報が見つかりません\n")
				} else {
					// 安全な型アサーション
					stripeCustomerID, ok := payment["stripe_customer_id"].(string)
					if !ok {
						fmt.Printf("⚠ エラー: Stripe顧客IDの型変換に失敗しました\n")
					} else {
						fmt.Printf("✓ MongoDBに登録されているStripe顧客ID: %s\n", stripeCustomerID)

						// この顧客IDが重複リストに含まれているか確認
						found := false
						isCorrectCustomer := false
						for _, c := range customers {
							if c.ID == stripeCustomerID {
								found = true
								// メタデータにuser_idが含まれており、それが一致するか確認
								if metaUserID, exists := c.Metadata["user_id"]; exists && metaUserID == userID.Hex() {
									isCorrectCustomer = true
								}
								break
							}
						}
						if !found {
							fmt.Printf("⚠ 警告: MongoDBに登録されている顧客IDが重複リストに含まれていません\n")
						} else if isCorrectCustomer {
							fmt.Printf("✓ 正しい顧客（メタデータのuser_idが一致）: %s\n", stripeCustomerID)
						} else {
							fmt.Printf("⚠ 注意: 顧客 %s のメタデータにuser_idが設定されていないか、不一致です\n", stripeCustomerID)
						}
					}
				}
			}
		}

		// 各顧客の詳細を表示
		fmt.Println("\n重複顧客の詳細:")
		for i, c := range customers {
			fmt.Printf("\n  [%d] 顧客ID: %s\n", i+1, c.ID)
			fmt.Printf("      作成日: %s\n", time.Unix(c.Created, 0).Format("2006-01-02 15:04:05"))
			fmt.Printf("      名前: %s\n", c.Name)
			fmt.Printf("      メール: %s\n", c.Email)

			// メタデータを表示
			if userID, exists := c.Metadata["user_id"]; exists {
				fmt.Printf("      メタデータ user_id: %s\n", userID)
			} else {
				fmt.Printf("      メタデータ user_id: (未設定)\n")
			}
			if studentID, exists := c.Metadata["student_id"]; exists {
				fmt.Printf("      メタデータ student_id: %s\n", studentID)
			}

			// 支払い方法の有無を確認
			pmList := paymentmethod.List(&stripe.PaymentMethodListParams{
				Customer: stripe.String(c.ID),
				Type:     stripe.String("card"),
			})
			pmCount := 0
			for pmList.Next() {
				pmCount++
			}
			if pmList.Err() != nil {
				fmt.Printf("      登録済み支払い方法: エラー (%v)\n", pmList.Err())
			} else {
				fmt.Printf("      登録済み支払い方法: %d件\n", pmCount)
			}

			// サブスクリプションの有無を確認
			subList := subscriptionapi.List(&stripe.SubscriptionListParams{
				Customer: c.ID,
			})
			subCount := 0
			activeSubCount := 0
			for subList.Next() {
				sub := subList.Subscription()
				subCount++
				if sub.Status == "active" || sub.Status == "trialing" {
					activeSubCount++
				}
			}
			if subList.Err() != nil {
				fmt.Printf("      サブスクリプション: エラー (%v)\n", subList.Err())
			} else {
				fmt.Printf("      サブスクリプション: %d件 (アクティブ: %d件)\n", subCount, activeSubCount)
			}
		}

		// 推奨事項を表示
		fmt.Println("\n推奨事項:")
		fmt.Println("  1. メタデータのuser_idが正しく設定されている顧客を保持")
		fmt.Println("  2. user_idが未設定または古い顧客は削除対象")
		fmt.Println("  3. 支払い方法やサブスクリプションがある場合は、保持する顧客に移行してから削除")
		fmt.Println("  4. MongoDBのpaymentsコレクションに登録されている顧客IDを確認")
		fmt.Println("  5. 削除はStripeダッシュボードまたはStripe CLIから実行")
		fmt.Println("     例: stripe customers delete <customer_id>")
	}

	fmt.Println("\n=== 検出完了 ===")
	fmt.Println("重複顧客を統合する場合は、上記の推奨事項に従って手動で作業してください")
}

// findDuplicateCustomers はStripe側で重複している顧客を検出
func findDuplicateCustomers(ctx context.Context) map[string][]*stripe.Customer {
	// メールアドレスごとに顧客をグループ化
	emailMap := make(map[string][]*stripe.Customer)

	// 全顧客を取得（メールアドレスでフィルタリングできないため全件取得）
	params := &stripe.CustomerListParams{}
	params.Limit = stripe.Int64(100) // 一度に取得する件数

	customerIter := customer.List(params)
	count := 0
	for customerIter.Next() {
		c := customerIter.Customer()
		count++

		// メールアドレスがある顧客のみを対象
		if c.Email != "" {
			emailMap[c.Email] = append(emailMap[c.Email], c)
		}

		// 進捗表示（100件ごと）
		if count%100 == 0 {
			fmt.Printf("  処理中: %d件の顧客を確認しました...\r", count)
		}
	}

	// エラーチェック
	if customerIter.Err() != nil {
		log.Printf("\n警告: Stripe顧客の取得中にエラーが発生しました: %v", customerIter.Err())
	}

	fmt.Printf("  処理完了: 合計 %d件の顧客を確認しました\n", count)

	// 重複があるものだけを返す
	duplicates := make(map[string][]*stripe.Customer)
	for email, customers := range emailMap {
		if len(customers) > 1 {
			duplicates[email] = customers
		}
	}

	return duplicates
}
