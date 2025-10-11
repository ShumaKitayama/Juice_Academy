package middleware

import (
    "context"
    "fmt"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "juice_academy_backend/services"
)

// RateLimit provides a simple Redis-backed rate limiter middleware.
// keyPrefix: logical bucket name
// max: maximum allowed requests within window per key (IP[:user])
// window: time window for the rate limit
func RateLimit(keyPrefix string, max int, window time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        // If Redis is not initialized, skip enforcement to avoid hard failures
        if services.RedisClient == nil {
            c.Next()
            return
        }

        ip := c.ClientIP()
        key := fmt.Sprintf("rl:%s:%s", keyPrefix, ip)
        if uid, exists := c.Get("user_id"); exists {
            key = fmt.Sprintf("rl:%s:%s:%v", keyPrefix, ip, uid)
        }

        ctx := context.Background()
        // Increment counter
        n, err := services.RedisClient.Incr(ctx, key).Result()
        if err != nil {
            // On Redis error, do not block the request
            c.Next()
            return
        }
        if n == 1 {
            // Set TTL on first hit
            _ = services.RedisClient.Expire(ctx, key, window).Err()
        }
        if n > int64(max) {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "レート制限に達しました。しばらくしてからお試しください",
            })
            return
        }
        c.Next()
    }
}

