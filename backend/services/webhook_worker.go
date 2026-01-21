package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"juice_academy_backend/utils"

	"github.com/stripe/stripe-go/v81"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// WebhookJob はWebhook処理のジョブを表す
type WebhookJob struct {
	Event         stripe.Event
	CorrelationID string
}

// WebhookWorkerConfig はWorker Poolの設定
type WebhookWorkerConfig struct {
	WorkerCount int
	QueueSize   int
}

var (
	webhookJobQueue chan WebhookJob
	webhookWg       sync.WaitGroup
	webhookOnce     sync.Once
	shutdownChan    chan struct{}

	// MongoDBコレクションへの参照（外部から設定）
	webhookSubscriptionCollection *mongo.Collection
)

// DefaultWebhookConfig はデフォルトのWorker設定
var DefaultWebhookConfig = WebhookWorkerConfig{
	WorkerCount: 5,
	QueueSize:   100,
}

// InitWebhookWorker はWebhook Worker Poolを初期化する
func InitWebhookWorker(config WebhookWorkerConfig, subCollection *mongo.Collection) {
	webhookOnce.Do(func() {
		webhookSubscriptionCollection = subCollection
		webhookJobQueue = make(chan WebhookJob, config.QueueSize)
		shutdownChan = make(chan struct{})

		// Worker を起動
		for i := 0; i < config.WorkerCount; i++ {
			webhookWg.Add(1)
			go webhookWorker(i)
		}

		utils.LogInfo("WebhookWorker", fmt.Sprintf("Started %d webhook workers", config.WorkerCount))
	})
}

// EnqueueWebhookJob はWebhookジョブをキューに追加する
func EnqueueWebhookJob(event stripe.Event, correlationID string) bool {
	if webhookJobQueue == nil {
		utils.LogWarning("WebhookWorker", "Webhook job queue not initialized, processing synchronously")
		return false
	}

	select {
	case webhookJobQueue <- WebhookJob{Event: event, CorrelationID: correlationID}:
		return true
	default:
		// キューが満杯の場合
		utils.LogWarning("WebhookWorker", "Webhook job queue is full, job dropped: "+event.ID)
		return false
	}
}

// ShutdownWebhookWorker はWorker Poolを安全にシャットダウンする
func ShutdownWebhookWorker() {
	if shutdownChan == nil {
		return
	}

	close(shutdownChan)

	// キューを閉じる前に、残りのジョブを処理するために少し待機
	done := make(chan struct{})
	go func() {
		webhookWg.Wait()
		close(done)
	}()

	select {
	case <-done:
		utils.LogInfo("WebhookWorker", "All webhook workers shut down gracefully")
	case <-time.After(30 * time.Second):
		utils.LogWarning("WebhookWorker", "Webhook worker shutdown timed out")
	}

	if webhookJobQueue != nil {
		close(webhookJobQueue)
	}
}

// webhookWorker は単一のWorkerの処理ループ
func webhookWorker(id int) {
	defer webhookWg.Done()

	for {
		select {
		case <-shutdownChan:
			utils.LogInfo("WebhookWorker", fmt.Sprintf("Worker %d shutting down", id))
			return
		case job, ok := <-webhookJobQueue:
			if !ok {
				return
			}
			processWebhookJob(job)
		}
	}
}

// processWebhookJob は単一のWebhookジョブを処理する
func processWebhookJob(job WebhookJob) {
	ctx := utils.WithCorrelation(context.Background(), job.CorrelationID)

	defer func() {
		if r := recover(); r != nil {
			utils.LogErrorCtx(ctx, "WebhookWorker", nil, fmt.Sprintf("Panic in webhook processing: %v", r))
		}
	}()

	event := job.Event
	utils.LogInfoCtx(ctx, "WebhookWorker", fmt.Sprintf("Processing event: %s, type: %s", event.ID, event.Type))

	switch event.Type {
	case "checkout.session.completed":
		handleCheckoutSessionCompleted(ctx, event)

	case "customer.subscription.updated":
		handleSubscriptionUpdated(ctx, event)

	case "customer.subscription.deleted":
		handleSubscriptionDeleted(ctx, event)

	case "customer.subscription.trial_will_end":
		handleTrialWillEnd(ctx, event)

	case "invoice.paid":
		handleInvoicePaid(ctx, event)

	case "invoice.payment_failed":
		handleInvoicePaymentFailed(ctx, event)

	case "invoice.upcoming":
		handleInvoiceUpcoming(ctx, event)

	case "payment_intent.succeeded":
		handlePaymentIntentSucceeded(ctx, event)

	case "payment_intent.payment_failed":
		handlePaymentIntentFailed(ctx, event)

	case "charge.dispute.created":
		handleDisputeCreated(ctx, event)

	default:
		utils.LogInfoCtx(ctx, "WebhookWorker", fmt.Sprintf("Unhandled event type: %s", event.Type))
	}
}

// handleCheckoutSessionCompleted はcheckout.session.completedイベントを処理
func handleCheckoutSessionCompleted(ctx context.Context, event stripe.Event) {
	var checkoutSession stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &checkoutSession); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse checkout session data")
		return
	}

	if checkoutSession.Mode != "subscription" || checkoutSession.Subscription == nil {
		return
	}

	userID, err := primitive.ObjectIDFromHex(checkoutSession.ClientReferenceID)
	if err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Invalid user ID in checkout session")
		return
	}

	now := time.Now()
	nextMonth := now.AddDate(0, 1, 0)

	filter := bson.M{"user_id": userID}
	update := bson.M{
		"$set": bson.M{
			"stripe_subscription_id": checkoutSession.Subscription.ID,
			"stripe_customer_id":     checkoutSession.Customer.ID,
			"status":                 "active",
			"current_period_end":     nextMonth,
			"cancel_at_period_end":   false,
			"updated_at":             now,
		},
		"$setOnInsert": bson.M{
			"user_id":    userID,
			"created_at": now,
		},
	}

	if webhookSubscriptionCollection != nil {
		_, err = webhookSubscriptionCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to update subscription from checkout session")
		}
	}
}

// handleSubscriptionUpdated はcustomer.subscription.updatedイベントを処理
func handleSubscriptionUpdated(ctx context.Context, event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse subscription data")
		return
	}

	if webhookSubscriptionCollection == nil {
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status":               string(sub.Status),
			"current_period_end":   time.Unix(sub.CurrentPeriodEnd, 0),
			"cancel_at_period_end": sub.CancelAtPeriodEnd,
			"updated_at":           time.Now(),
		},
	}
	_, err := webhookSubscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": sub.ID}, update)
	if err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to update subscription")
	}
}

// handleSubscriptionDeleted はcustomer.subscription.deletedイベントを処理
func handleSubscriptionDeleted(ctx context.Context, event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse subscription data")
		return
	}

	utils.LogInfoCtx(ctx, "WebhookWorker", "Subscription deleted: "+sub.ID)

	if webhookSubscriptionCollection == nil {
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status":               "canceled",
			"cancel_at_period_end": true,
			"updated_at":           time.Now(),
		},
	}
	_, err := webhookSubscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": sub.ID}, update)
	if err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to update subscription status")
	}
}

// handleTrialWillEnd はcustomer.subscription.trial_will_endイベントを処理
func handleTrialWillEnd(ctx context.Context, event stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse subscription data")
		return
	}

	trialEnd := time.Unix(sub.TrialEnd, 0)
	utils.LogInfoCtx(ctx, "WebhookWorker",
		fmt.Sprintf("Trial will end for subscription: %s, ends at: %s", sub.ID, trialEnd.Format("2006-01-02")))

	// TODO: ユーザーにメール通知を送信する処理を追加
}

// handleInvoicePaid はinvoice.paidイベントを処理
func handleInvoicePaid(ctx context.Context, event stripe.Event) {
	var inv stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse invoice data")
		return
	}

	utils.LogInfoCtx(ctx, "WebhookWorker",
		fmt.Sprintf("Invoice paid: %s, Amount: %d", utils.MaskStripeID(inv.ID), inv.AmountPaid))

	if inv.Subscription == nil || webhookSubscriptionCollection == nil {
		return
	}

	// キャンセル予約済みサブスクリプションへの課金を検出
	var sub struct {
		CancelAtPeriodEnd bool `bson:"cancel_at_period_end"`
	}
	err := webhookSubscriptionCollection.FindOne(ctx, bson.M{"stripe_subscription_id": inv.Subscription.ID}).Decode(&sub)
	if err == nil && sub.CancelAtPeriodEnd {
		utils.LogErrorCtx(ctx, "WebhookWorker", nil,
			fmt.Sprintf("WARNING: Payment for canceled subscription! Sub: %s, Invoice: %s",
				utils.MaskStripeID(inv.Subscription.ID), utils.MaskStripeID(inv.ID)))
	}
}

// handleInvoicePaymentFailed はinvoice.payment_failedイベントを処理
func handleInvoicePaymentFailed(ctx context.Context, event stripe.Event) {
	var inv stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse invoice data")
		return
	}

	utils.LogErrorCtx(ctx, "WebhookWorker", nil,
		fmt.Sprintf("Invoice payment FAILED: %s, Amount: %d", utils.MaskStripeID(inv.ID), inv.AmountDue))

	if inv.Subscription == nil || webhookSubscriptionCollection == nil {
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status":     "past_due",
			"updated_at": time.Now(),
		},
	}
	_, err := webhookSubscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": inv.Subscription.ID}, update)
	if err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to update subscription status after payment failure")
	}
}

// handleInvoiceUpcoming はinvoice.upcomingイベントを処理
func handleInvoiceUpcoming(ctx context.Context, event stripe.Event) {
	var inv stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse invoice data")
		return
	}

	utils.LogInfoCtx(ctx, "WebhookWorker",
		fmt.Sprintf("Upcoming invoice: Amount: %d", inv.AmountDue))

	if inv.Subscription == nil || webhookSubscriptionCollection == nil {
		return
	}

	// キャンセル予約済みサブスクリプションへの次回課金予定を検出
	var sub struct {
		CancelAtPeriodEnd bool `bson:"cancel_at_period_end"`
	}
	err := webhookSubscriptionCollection.FindOne(ctx, bson.M{"stripe_subscription_id": inv.Subscription.ID}).Decode(&sub)
	if err == nil && sub.CancelAtPeriodEnd {
		utils.LogErrorCtx(ctx, "WebhookWorker", nil,
			fmt.Sprintf("CRITICAL: Upcoming invoice for canceled subscription! Sub: %s",
				utils.MaskStripeID(inv.Subscription.ID)))
	}
}

// handlePaymentIntentSucceeded はpayment_intent.succeededイベントを処理
func handlePaymentIntentSucceeded(ctx context.Context, event stripe.Event) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse payment intent data")
		return
	}

	utils.LogInfoCtx(ctx, "WebhookWorker",
		fmt.Sprintf("Payment succeeded: %s, Amount: %d %s",
			utils.MaskStripeID(pi.ID), pi.Amount, pi.Currency))
}

// handlePaymentIntentFailed はpayment_intent.payment_failedイベントを処理
func handlePaymentIntentFailed(ctx context.Context, event stripe.Event) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse payment intent data")
		return
	}

	errorMsg := "unknown error"
	if pi.LastPaymentError != nil {
		errorMsg = pi.LastPaymentError.Msg
	}

	utils.LogErrorCtx(ctx, "WebhookWorker", nil,
		fmt.Sprintf("Payment failed: %s, Amount: %d, Error: %s",
			utils.MaskStripeID(pi.ID), pi.Amount, errorMsg))
}

// handleDisputeCreated はcharge.dispute.createdイベントを処理
func handleDisputeCreated(ctx context.Context, event stripe.Event) {
	var dispute stripe.Dispute
	if err := json.Unmarshal(event.Data.Raw, &dispute); err != nil {
		utils.LogErrorCtx(ctx, "WebhookWorker", err, "Failed to parse dispute data")
		return
	}

	utils.LogErrorCtx(ctx, "WebhookWorker", nil,
		fmt.Sprintf("ALERT: Dispute created! ID: %s, Amount: %d, Reason: %s",
			utils.MaskStripeID(dispute.ID), dispute.Amount, dispute.Reason))

	// TODO: 管理者にアラート通知を送信
}
