package utils

import (
	"fmt"
	"log"
	"regexp"
	"strings"
)

var (
	// メールアドレスのマスキング用正規表現
	emailRegex = regexp.MustCompile(`([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`)
	
	// Stripe IDのマスキング用正規表現
	stripeCustomerRegex = regexp.MustCompile(`cus_[a-zA-Z0-9]+`)
	stripePaymentMethodRegex = regexp.MustCompile(`pm_[a-zA-Z0-9]+`)
	stripeSubscriptionRegex = regexp.MustCompile(`sub_[a-zA-Z0-9]+`)
	stripePaymentIntentRegex = regexp.MustCompile(`pi_[a-zA-Z0-9]+`)
	stripeSetupIntentRegex = regexp.MustCompile(`seti_[a-zA-Z0-9]+`)
)

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
	
	return text
}

// LogSafe は安全にログを出力します（PIIをマスキング）
func LogSafe(format string, v ...interface{}) {
	message := fmt.Sprintf(format, v...)
	maskedMessage := MaskPII(message)
	log.Print(maskedMessage)
}

// LogfSafe は安全にフォーマット付きでログを出力します（PIIをマスキング）
func LogfSafe(format string, v ...interface{}) {
	message := fmt.Sprintf(format, v...)
	maskedMessage := MaskPII(message)
	log.Printf(maskedMessage)
}

// LogError はエラーログを安全に出力します
func LogError(context string, err error, additionalInfo ...string) {
	message := fmt.Sprintf("[ERROR] %s: %v", context, err)
	if len(additionalInfo) > 0 {
		message += " | " + strings.Join(additionalInfo, " | ")
	}
	LogSafe(message)
}

// LogInfo は情報ログを安全に出力します
func LogInfo(context string, message string) {
	LogfSafe("[INFO] %s: %s", context, message)
}

// LogWarning は警告ログを安全に出力します
func LogWarning(context string, message string) {
	LogfSafe("[WARNING] %s: %s", context, message)
}

