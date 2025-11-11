package controllers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CSRFProtection は状態変更系リクエストに対しCSRFトークン検証を実施する
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}

		csrfToken := c.GetHeader("X-CSRF-Token")
		if csrfToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRFトークンが必要です"})
			return
		}

		refreshToken, err := c.Cookie("refresh_token")
		if err != nil || refreshToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "リフレッシュトークンが無効です"})
			return
		}

		ctx := context.Background()
		doc, err := findActiveRefreshToken(ctx, refreshToken)
		if err != nil {
			clearRefreshCookie(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "リフレッシュトークンが無効です"})
			return
		}

		if hashToken(csrfToken) != doc.CSRFHash {
			_ = revokeRefreshToken(ctx, refreshToken)
			clearRefreshCookie(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "CSRFトークンが無効です"})
			return
		}

		c.Next()
	}
}
