package controllers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	refreshTokenCollection *mongo.Collection
	accessTokenDuration    = 15 * time.Minute
	refreshTokenDuration   = 30 * 24 * time.Hour
)

func init() {
	if minutes := os.Getenv("ACCESS_TOKEN_MINUTES"); minutes != "" {
		if parsed, err := strconv.Atoi(minutes); err == nil && parsed > 0 {
			accessTokenDuration = time.Duration(parsed) * time.Minute
		}
	}

	if days := os.Getenv("REFRESH_TOKEN_DAYS"); days != "" {
		if parsed, err := strconv.Atoi(days); err == nil && parsed > 0 {
			refreshTokenDuration = time.Duration(parsed) * 24 * time.Hour
		}
	}
}

// RefreshTokenDoc はリフレッシュトークンの永続化構造を表す
type RefreshTokenDoc struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	UserID    primitive.ObjectID `bson:"user_id"`
	TokenHash string             `bson:"token_hash"`
	CSRFHash  string             `bson:"csrf_hash"`
	IP        string             `bson:"ip,omitempty"`
	UserAgent string             `bson:"user_agent,omitempty"`
	ExpiresAt time.Time          `bson:"expires_at"`
	CreatedAt time.Time          `bson:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"`
	Revoked   bool               `bson:"revoked"`
}

// InitRefreshTokenCollection はリフレッシュトークンコレクションを初期化する
func InitRefreshTokenCollection(client *mongo.Client) {
	refreshTokenCollection = client.Database("juice_academy").Collection("refresh_tokens")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, _ = refreshTokenCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "token_hash", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("token_hash_unique"),
		},
		{
			Keys:    bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0).SetName("expires_at_ttl"),
		},
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "revoked", Value: 1}},
			Options: options.Index().SetName("user_revoked_idx"),
		},
	})
}

func generateSecureToken(bytes int) (string, error) {
	buf := make([]byte, bytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func storeRefreshToken(ctx context.Context, userID primitive.ObjectID, refreshToken, csrfToken, userAgent, ip string) (*RefreshTokenDoc, error) {
	if refreshTokenCollection == nil {
		return nil, errors.New("refresh token collection is not initialized")
	}

	now := time.Now()
	doc := RefreshTokenDoc{
		UserID:    userID,
		TokenHash: hashToken(refreshToken),
		CSRFHash:  hashToken(csrfToken),
		IP:        ip,
		UserAgent: userAgent,
		ExpiresAt: now.Add(refreshTokenDuration),
		CreatedAt: now,
		UpdatedAt: now,
		Revoked:   false,
	}

	_, err := refreshTokenCollection.InsertOne(ctx, doc)
	if err != nil {
		return nil, err
	}

	return &doc, nil
}

func revokeRefreshToken(ctx context.Context, refreshToken string) error {
	if refreshTokenCollection == nil {
		return errors.New("refresh token collection is not initialized")
	}

	tokenHash := hashToken(refreshToken)
	_, err := refreshTokenCollection.UpdateOne(
		ctx,
		bson.M{"token_hash": tokenHash, "revoked": false},
		bson.M{"$set": bson.M{"revoked": true, "updated_at": time.Now()}},
	)
	return err
}

func findActiveRefreshToken(ctx context.Context, refreshToken string) (*RefreshTokenDoc, error) {
	if refreshTokenCollection == nil {
		return nil, errors.New("refresh token collection is not initialized")
	}

	tokenHash := hashToken(refreshToken)
	var doc RefreshTokenDoc
	err := refreshTokenCollection.FindOne(ctx, bson.M{"token_hash": tokenHash, "revoked": false}).Decode(&doc)
	if err != nil {
		return nil, err
	}

	if doc.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token expired")
	}

	return &doc, nil
}

func rotateRefreshToken(ctx context.Context, existing *RefreshTokenDoc, newRefreshToken, newCSRFToken, userAgent, ip string) error {
	if refreshTokenCollection == nil {
		return errors.New("refresh token collection is not initialized")
	}

	now := time.Now()

	_, err := refreshTokenCollection.UpdateByID(ctx, existing.ID, bson.M{
		"$set": bson.M{
			"revoked":    true,
			"updated_at": now,
		},
	})
	if err != nil {
		return err
	}

	_, err = refreshTokenCollection.InsertOne(ctx, RefreshTokenDoc{
		UserID:    existing.UserID,
		TokenHash: hashToken(newRefreshToken),
		CSRFHash:  hashToken(newCSRFToken),
		IP:        ip,
		UserAgent: userAgent,
		ExpiresAt: now.Add(refreshTokenDuration),
		CreatedAt: now,
		UpdatedAt: now,
		Revoked:   false,
	})

	return err
}

func issueTokens(c *gin.Context, user User) (accessToken string, csrfToken string, expiresIn int, err error) {
	accessToken, err = generateAccessToken(user)
	if err != nil {
		return "", "", 0, err
	}

	refreshToken, err := generateSecureToken(64)
	if err != nil {
		return "", "", 0, err
	}

	csrfToken, err = generateSecureToken(32)
	if err != nil {
		return "", "", 0, err
	}

	ctx := c.Request.Context()
	userAgent := c.Request.UserAgent()
	ip := c.ClientIP()

	for i := 0; i < 3; i++ {
		_, err = storeRefreshToken(ctx, user.ID, refreshToken, csrfToken, userAgent, ip)
		if err != nil {
			if mongo.IsDuplicateKeyError(err) {
				// 再生成してリトライ
				if refreshToken, err = generateSecureToken(64); err != nil {
					return "", "", 0, err
				}
				continue
			}
			return "", "", 0, err
		}
		break
	}
	if err != nil {
		return "", "", 0, err
	}

	setRefreshCookie(c, refreshToken, int(refreshTokenDuration.Seconds()))

	expiresIn = int(accessTokenDuration.Seconds())
	return accessToken, csrfToken, expiresIn, nil
}

func clearRefreshCookie(c *gin.Context) {
	setRefreshCookie(c, "", -1)
}

func setRefreshCookie(c *gin.Context, token string, maxAge int) {
	c.SetSameSite(http.SameSiteStrictMode)
	cookieDomain := os.Getenv("SESSION_COOKIE_DOMAIN")
	secure := os.Getenv("APP_ENV") != "development" && os.Getenv("APP_ENV") != "test"
	c.SetCookie("refresh_token", token, maxAge, "/api", cookieDomain, secure, true)
}
