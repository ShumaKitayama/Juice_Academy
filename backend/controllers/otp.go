package controllers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"juice_academy_backend/services"
	"math/big"
	"net/http"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// OTP はワンタイムパスコードの構造体
type OTP struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"user_id" json:"user_id"`
	Email        string             `bson:"email" json:"email"`
	Code         string             `bson:"code" json:"-"`
	Purpose      string             `bson:"purpose" json:"purpose"` // "login", "password_reset", etc.
	ExpiresAt    time.Time          `bson:"expires_at" json:"expires_at"`
	IsUsed       bool               `bson:"is_used" json:"is_used"`
	FailedAttempts int              `bson:"failed_attempts" json:"failed_attempts"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
}

var otpCollection *mongo.Collection

// InitOTPCollection はOTPコレクションを初期化
func InitOTPCollection(db *mongo.Database) {
	otpCollection = db.Collection("otps")
	fmt.Println("OTPコレクションが初期化されました")
	
	// TTLインデックスを作成（自動削除のため）
	ctx := context.Background()
	_, err := otpCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "expires_at", Value: 1}},
		Options: &options.IndexOptions{
			ExpireAfterSeconds: func() *int32 { i := int32(0); return &i }(),
		},
	})
	if err != nil {
		fmt.Printf("TTLインデックス作成エラー: %v\n", err)
	}
}

// generateOTP は6桁のワンタイムパスコードを生成
func generateOTP() (string, error) {
	const digits = "0123456789"
	const length = 6
	
	otp := make([]byte, length)
	for i := range otp {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		otp[i] = digits[num.Int64()]
	}
	
	return string(otp), nil
}

// hashOTP はOTPコードをハッシュ化
func hashOTP(code string) string {
	hash := sha256.Sum256([]byte(code))
	return fmt.Sprintf("%x", hash)
}

// SendOTPHandler はOTPを生成してメールで送信するハンドラ
func SendOTPHandler(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// サポートされている目的かチェック
	validPurposes := map[string]bool{
		"login":          true,
		"password_reset": true,
	}
	if !validPurposes[req.Purpose] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効な目的です"})
		return
	}

	// ユーザーの存在確認
	var user User
	ctx := context.Background()
	err := userCollection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// セキュリティのため、ユーザーが存在しなくても成功レスポンスを返す
			c.JSON(http.StatusOK, gin.H{
				"message": "認証コードを送信しました",
				"expires_in": 300, // 5分
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	// 既存の未使用OTPを無効化
	_, err = otpCollection.UpdateMany(ctx, bson.M{
		"user_id": user.ID,
		"purpose": req.Purpose,
		"is_used":  false,
	}, bson.M{
		"$set": bson.M{"is_used": true},
	})
	if err != nil {
		fmt.Printf("既存OTP無効化エラー: %v\n", err)
	}

	// 新しいOTPを生成
	code, err := generateOTP()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "認証コードの生成に失敗しました"})
		return
	}

	// OTPをデータベースに保存
	now := time.Now()
	expiresAt := now.Add(5 * time.Minute) // 5分間有効

	otp := OTP{
		UserID:         user.ID,
		Email:          user.Email,
		Code:           hashOTP(code), // OTPをハッシュ化して保存
		Purpose:        req.Purpose,
		ExpiresAt:      expiresAt,
		IsUsed:         false,
		FailedAttempts: 0,
		CreatedAt:      now,
	}

	result, err := otpCollection.InsertOne(ctx, otp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "認証コードの保存に失敗しました"})
		return
	}

	// メールでOTPを送信
	err = services.SendOTPEmail(user.Email, user.NameKana, code, req.Purpose)
	if err != nil {
		fmt.Printf("OTPメール送信エラー: %v\n", err)
		// メール送信に失敗した場合はOTPを削除
		otpCollection.DeleteOne(ctx, bson.M{"_id": result.InsertedID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "認証コードの送信に失敗しました"})
		return
	}

	fmt.Printf("OTPが生成されました: userID=%s, email=%s, purpose=%s\n", user.ID.Hex(), user.Email, req.Purpose)

	c.JSON(http.StatusOK, gin.H{
		"message":    "認証コードを送信しました",
		"expires_in": 300, // 5分
	})
}

// VerifyOTPHandler はOTPを検証するハンドラ
func VerifyOTPHandler(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Code    string `json:"code" binding:"required"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// ユーザーの存在確認
	var user User
	ctx := context.Background()
	err := userCollection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証に失敗しました"})
		return
	}

	// Redisで重複使用をチェック（短期間のキャッシュ）
	isRecentlyUsed, err := services.IsOTPRecentlyUsed(user.ID.Hex(), req.Purpose)
	if err != nil {
		fmt.Printf("OTP重複チェックエラー: %v\n", err)
	} else if isRecentlyUsed {
		fmt.Printf("OTP重複使用検出: userID=%s, purpose=%s\n", user.ID.Hex(), req.Purpose)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "この認証コードは既に使用されています"})
		return
	}

	// リクエストの重複排除のため、処理開始時点でRedisに記録
	err = services.StoreOTPUsage(user.ID.Hex(), req.Purpose, 10*time.Second)
	if err != nil {
		fmt.Printf("OTP処理開始記録エラー: %v\n", err)
	}

	// OTPの検証と使用済みマークを原子的操作で実行
	hashedCode := hashOTP(req.Code)
	
	// FindOneAndUpdateを使用してOTPの検証と使用済みマークを同時に行う
	var otp OTP
	update := bson.M{
		"$set": bson.M{"is_used": true},
	}
	
	err = otpCollection.FindOneAndUpdate(ctx, bson.M{
		"user_id": user.ID,
		"code":    hashedCode,
		"purpose": req.Purpose,
		"is_used": false,
		"failed_attempts": bson.M{"$lt": 5},
		"expires_at": bson.M{"$gt": time.Now()},
	}, update).Decode(&otp)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			// 詳細なログ出力（デバッグ用）
			fmt.Printf("OTP検証失敗: userID=%s, email=%s, code=%s, purpose=%s\n", 
				user.ID.Hex(), user.Email, req.Code, req.Purpose)
			
			// 失敗試行回数を増加（最大5回まで）
			_, updateErr := otpCollection.UpdateMany(ctx, bson.M{
				"user_id": user.ID,
				"purpose": req.Purpose,
				"is_used": false,
				"failed_attempts": bson.M{"$lt": 5},
			}, bson.M{
				"$inc": bson.M{"failed_attempts": 1},
			})
			if updateErr != nil {
				fmt.Printf("失敗試行回数更新エラー: %v\n", updateErr)
			}
			
			// 期限切れか使用済みかを確認
			var expiredOTP OTP
			expiredErr := otpCollection.FindOne(ctx, bson.M{
				"user_id": user.ID,
				"code":    hashedCode,
				"purpose": req.Purpose,
			}).Decode(&expiredOTP)
			
			if expiredErr == nil {
				if expiredOTP.FailedAttempts >= 5 {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "試行回数が上限に達しました。新しい認証コードを取得してください"})
				} else if expiredOTP.IsUsed {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "この認証コードは既に使用されています"})
				} else if expiredOTP.ExpiresAt.Before(time.Now()) {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "認証コードの有効期限が切れています"})
				} else {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "無効な認証コードです"})
				}
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "無効な認証コードです"})
			}
			return
		}
		fmt.Printf("OTP検証データベースエラー: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "認証コードの検証に失敗しました"})
		return
	}

	// Redisに使用状況を記録（60秒間、成功時のみ）
	err = services.StoreOTPUsage(user.ID.Hex(), req.Purpose, 60*time.Second)
	if err != nil {
		fmt.Printf("OTP使用状況記録エラー: %v\n", err)
	}

	fmt.Printf("OTP検証成功: userID=%s, email=%s, purpose=%s\n", user.ID.Hex(), user.Email, req.Purpose)

	// 目的に応じた処理
	switch req.Purpose {
	case "login":
		// ログイン用のJWTトークンを生成
		token, err := generateJWTToken(user)
		if err != nil {
			// トークン生成に失敗した場合、OTPの使用済みマークを取り消す
			_, rollbackErr := otpCollection.UpdateOne(ctx, bson.M{"_id": otp.ID}, bson.M{
				"$set": bson.M{"is_used": false},
			})
			if rollbackErr != nil {
				fmt.Printf("OTP使用済みマークロールバックエラー: %v\n", rollbackErr)
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "認証トークンの生成に失敗しました"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "認証が完了しました",
			"token":   token,
			"user": gin.H{
				"id":        user.ID,
				"email":     user.Email,
				"role":      user.Role,
				"studentId": user.StudentID,
				"nameKana":  user.NameKana,
				"isAdmin":   user.IsAdmin,
			},
		})

	case "password_reset":
		// パスワードリセット用の一時トークンを生成（今後の実装で使用）
		c.JSON(http.StatusOK, gin.H{
			"message": "認証が完了しました",
			"verified": true,
		})

	default:
		c.JSON(http.StatusOK, gin.H{
			"message": "認証が完了しました",
			"verified": true,
		})
	}
}

// ResendOTPHandler はOTPを再送信するハンドラ
func ResendOTPHandler(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// レート制限チェック（1分以内の再送信を防ぐ）
	ctx := context.Background()
	var lastOTP OTP
	err := otpCollection.FindOne(ctx, bson.M{
		"email":   req.Email,
		"purpose": req.Purpose,
		"created_at": bson.M{"$gt": time.Now().Add(-1 * time.Minute)},
	}).Decode(&lastOTP)

	if err == nil {
		// 残り時間を計算
		remainingTime := 60 - int(time.Since(lastOTP.CreatedAt).Seconds())
		if remainingTime > 0 {
			fmt.Printf("レート制限適用: email=%s, 残り時間=%d秒\n", req.Email, remainingTime)
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": fmt.Sprintf("認証コードは1分間に1回まで送信できます（残り%d秒）", remainingTime),
				"retry_after": remainingTime,
			})
			return
		}
	}

	// 通常のOTP送信処理を実行
	SendOTPHandler(c)
}

// generateJWTToken はユーザー用のJWTトークンを生成
func generateJWTToken(user User) (string, error) {
	// 環境変数からJWTシークレットを取得
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET environment variable is not set")
	}
	jwtSecret := []byte(secret)
	
	// 一意のJWT IDを生成
	jti := uuid.New().String()
	expiry := time.Now().Add(time.Hour * 72)
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"jti":     jti,                    // JWT ID（一意識別子）
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    user.Role,
		"isAdmin": user.IsAdmin,
		"iat":     time.Now().Unix(),      // 発行時刻
		"exp":     expiry.Unix(),          // 有効期限
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	fmt.Printf("JWT生成成功: jti=%s, user_id=%s, expires_at=%v\n", jti, user.ID.Hex(), expiry)
	return tokenString, nil
}
