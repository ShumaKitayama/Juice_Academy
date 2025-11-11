package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"juice_academy_backend/utils"
)

// CorrelationID は各リクエストに相関IDを付与し、レスポンスヘッダーへ伝播させる
func CorrelationID() gin.HandlerFunc {
	return func(c *gin.Context) {
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = uuid.New().String()
		}

		c.Set("correlation_id", correlationID)
		c.Writer.Header().Set("X-Correlation-ID", correlationID)
		ctx := utils.WithCorrelation(c.Request.Context(), correlationID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}
