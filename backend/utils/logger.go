package utils

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
)

var (
	// メールアドレスのマスキング用正規表現
	emailRegex = regexp.MustCompile(`([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`)

	// Stripe IDのマスキング用正規表現
	stripeCustomerRegex      = regexp.MustCompile(`cus_[a-zA-Z0-9]+`)
	stripePaymentMethodRegex = regexp.MustCompile(`pm_[a-zA-Z0-9]+`)
	stripeSubscriptionRegex  = regexp.MustCompile(`sub_[a-zA-Z0-9]+`)
	stripePaymentIntentRegex = regexp.MustCompile(`pi_[a-zA-Z0-9]+`)
	stripeSetupIntentRegex   = regexp.MustCompile(`seti_[a-zA-Z0-9]+`)
	stripeInvoiceRegex       = regexp.MustCompile(`in_[a-zA-Z0-9]+`)
	stripeChargeRegex        = regexp.MustCompile(`ch_[a-zA-Z0-9]+`)
	stripeDisputeRegex       = regexp.MustCompile(`dp_[a-zA-Z0-9]+`)
	stripeEventRegex         = regexp.MustCompile(`evt_[a-zA-Z0-9]+`)
)

type contextKey string

const correlationIDKey contextKey = "correlation_id"

// WithCorrelation はcontextにCorrelation-IDを紐付ける
func WithCorrelation(ctx context.Context, correlationID string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, correlationIDKey, correlationID)
}

func correlationIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if value, ok := ctx.Value(correlationIDKey).(string); ok {
		return value
	}
	return ""
}

func logSafeWithContext(ctx context.Context, format string, v ...interface{}) {
	message := fmt.Sprintf(format, v...)
	if cid := correlationIDFromContext(ctx); cid != "" {
		message = fmt.Sprintf("[cid=%s] %s", cid, message)
	}
	maskedMessage := MaskPII(message)
	log.Print(maskedMessage)
}

// MaskEmail はメールアドレスをマスキングします
// 例: user@example.com -> u***r@example.com
func MaskEmail(email string) string {
	if email == "" {
		return ""
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "***@***"
	}

	local := parts[0]
	domain := parts[1]

	if len(local) <= 2 {
		return "*@" + domain
	}

	return string(local[0]) + "***" + string(local[len(local)-1]) + "@" + domain
}

// MaskStripeID はStripe IDをマスキングします
// 例: cus_1234567890abcdef -> cus_***cdef
func MaskStripeID(id string) string {
	if id == "" {
		return ""
	}

	parts := strings.Split(id, "_")
	if len(parts) != 2 {
		return "***"
	}

	prefix := parts[0]
	suffix := parts[1]

	if len(suffix) <= 4 {
		return prefix + "_***"
	}

	return prefix + "_***" + suffix[len(suffix)-4:]
}

// MaskPII は文字列内のPII（個人識別情報）をマスキングします
func MaskPII(text string) string {
	// メールアドレスのマスキング
	text = emailRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskEmail(match)
	})

	// Stripe Customer IDのマスキング
	text = stripeCustomerRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Payment Method IDのマスキング
	text = stripePaymentMethodRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Subscription IDのマスキング
	text = stripeSubscriptionRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Payment Intent IDのマスキング
	text = stripePaymentIntentRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Setup Intent IDのマスキング
	text = stripeSetupIntentRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Invoice IDのマスキング
	text = stripeInvoiceRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Charge IDのマスキング
	text = stripeChargeRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Dispute IDのマスキング
	text = stripeDisputeRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// Stripe Event IDのマスキング
	text = stripeEventRegex.ReplaceAllStringFunc(text, func(match string) string {
		return MaskStripeID(match)
	})

	// OTPコードのマスキングは削除（件名などに影響しないように）

	return text
}

// LogSafe は安全にログを出力します（PIIをマスキング）
func LogSafe(format string, v ...interface{}) {
	LogSafeCtx(context.Background(), format, v...)
}

// LogSafeCtx はcontextに紐付いたCorrelation-IDを付加してログ出力します
func LogSafeCtx(ctx context.Context, format string, v ...interface{}) {
	logSafeWithContext(ctx, format, v...)
}

// LogfSafe は安全にフォーマット付きでログを出力します（PIIをマスキング）
func LogfSafe(format string, v ...interface{}) {
	LogSafeCtx(context.Background(), format, v...)
}

// LogError はエラーログを安全に出力します
func LogError(scope string, err error, additionalInfo ...string) {
	LogErrorCtx(context.Background(), scope, err, additionalInfo...)
}

// LogErrorCtx はCorrelation-ID付きでエラーログを出力します
func LogErrorCtx(ctx context.Context, scope string, err error, additionalInfo ...string) {
	message := fmt.Sprintf("[ERROR] %s: %v", scope, err)
	if len(additionalInfo) > 0 {
		message += " | " + strings.Join(additionalInfo, " | ")
	}
	logSafeWithContext(ctx, "%s", message)
}

// LogInfo は情報ログを安全に出力します
func LogInfo(scope string, message string) {
	LogInfoCtx(context.Background(), scope, message)
}

// LogInfoCtx はCorrelation-ID付きで情報ログを出力します
func LogInfoCtx(ctx context.Context, scope string, message string) {
	logSafeWithContext(ctx, "[INFO] %s: %s", scope, message)
}

// LogWarning は警告ログを安全に出力します
func LogWarning(scope string, message string) {
	LogWarningCtx(context.Background(), scope, message)
}

// LogWarningCtx はCorrelation-ID付きで警告ログを出力します
func LogWarningCtx(ctx context.Context, scope string, message string) {
	logSafeWithContext(ctx, "[WARNING] %s: %s", scope, message)
}
