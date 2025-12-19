package services

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

// InitRedis はRedisクライアントを初期化します
func InitRedis() error {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "redis:6379" // デフォルトはDockerコンテナ内のRedis
	}

	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: os.Getenv("REDIS_PASSWORD"), // パスワードが設定されていない場合は空文字
		DB:       0,                           // デフォルトDB
	})

	// 接続テスト (リトライ機能付き)
	var err error
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_, err = client.Ping(ctx).Result()
		cancel()

		if err == nil {
			break
		}

		if i < maxRetries-1 {
			fmt.Printf("Redis接続失敗 (試行 %d/%d): %v - 2秒後に再試行します...\n", i+1, maxRetries, err)
			time.Sleep(2 * time.Second)
		}
	}

	if err != nil {
		RedisClient = nil
		return fmt.Errorf("Redis接続に失敗しました (全試行失敗): %v", err)
	}

	RedisClient = client
	return nil
}

// BlacklistToken はJWTトークンをブラックリストに追加します
func BlacklistToken(jti string, expiration time.Duration) error {
	if RedisClient == nil {
		return fmt.Errorf("Redisクライアントが初期化されていません")
	}

	ctx := context.Background()
	key := fmt.Sprintf("blacklist:%s", jti)

	// トークンの有効期限と同じ期間でRedisに保存
	err := RedisClient.Set(ctx, key, "blacklisted", expiration).Err()
	if err != nil {
		return fmt.Errorf("トークンのブラックリスト登録に失敗しました: %v", err)
	}

	// セキュリティ: 本番環境ではトークン情報を詳細にログ出力しない
	if os.Getenv("APP_ENV") != "production" {
		fmt.Printf("トークンをブラックリストに追加: jti=%s\n", jti)
	}
	return nil
}

// IsTokenBlacklisted はJWTトークンがブラックリストに登録されているかチェックします
func IsTokenBlacklisted(jti string) (bool, error) {
	if RedisClient == nil {
		return false, fmt.Errorf("Redisクライアントが初期化されていません")
	}

	ctx := context.Background()
	key := fmt.Sprintf("blacklist:%s", jti)

	result, err := RedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		// キーが存在しない = ブラックリストに登録されていない
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("ブラックリストチェックに失敗しました: %v", err)
	}

	// キーが存在する = ブラックリストに登録されている
	return result == "blacklisted", nil
}

// StoreOTPUsage はOTPの使用状況を一時的に記録します（重複使用防止）
func StoreOTPUsage(userID, purpose string, duration time.Duration) error {
	if RedisClient == nil {
		return fmt.Errorf("Redisクライアントが初期化されていません")
	}

	ctx := context.Background()
	key := fmt.Sprintf("otp_used:%s:%s", userID, purpose)

	// 短期間（例：30秒）の間、OTPの使用を記録
	err := RedisClient.Set(ctx, key, "used", duration).Err()
	if err != nil {
		return fmt.Errorf("OTP使用状況の記録に失敗しました: %v", err)
	}

	return nil
}

// IsOTPRecentlyUsed は最近OTPが使用されたかチェックします
func IsOTPRecentlyUsed(userID, purpose string) (bool, error) {
	if RedisClient == nil {
		return false, fmt.Errorf("Redisクライアントが初期化されていません")
	}

	ctx := context.Background()
	key := fmt.Sprintf("otp_used:%s:%s", userID, purpose)

	result, err := RedisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("OTP使用状況チェックに失敗しました: %v", err)
	}

	return result == "used", nil
}
