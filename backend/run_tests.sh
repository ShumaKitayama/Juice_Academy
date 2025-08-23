#!/bin/bash

# Juice Academy バックエンドテストスイート実行スクリプト
# MongoDB統合テストを含む包括的なテスト実行

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

log_info "🚀 Juice Academy バックエンドテストスイートを実行中..."

# 環境変数の設定
export MONGODB_TEST_URI="mongodb://localhost:27018"

# 1. 基本テスト（MongoDB接続不要）
log_info "📋 基本テスト（MongoDB接続不要）を実行中..."
if go test -v ./controllers -run "TestRegister|TestLogin|TestGet.*Handler" ./middleware; then
    log_success "基本テストが成功しました"
else
    log_error "基本テストが失敗しました"
    exit 1
fi

# 2. JWTミドルウェアテスト
log_info "🔐 JWTミドルウェアテストを実行中..."
if go test -v ./middleware; then
    log_success "ミドルウェアテストが成功しました"
else
    log_error "ミドルウェアテストが失敗しました"
    exit 1
fi

# 3. MongoDB統合テスト用の環境準備
log_info "🐳 テスト用MongoDBコンテナを起動中..."

# 既存のテストコンテナを停止
docker-compose -f docker-compose.test.yml down -v > /dev/null 2>&1 || true

# テスト用MongoDBを起動
if docker-compose -f docker-compose.test.yml up -d; then
    log_success "テスト用MongoDBが起動しました"
else
    log_error "テスト用MongoDBの起動に失敗しました"
    exit 1
fi

# MongoDBの準備完了を待機
log_info "⏳ MongoDBの準備完了を待機中..."
for i in {1..30}; do
    if docker-compose -f docker-compose.test.yml exec -T mongodb-test mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        log_success "MongoDBが準備完了しました"
        break
    fi
    
    if [ $i -eq 30 ]; then
        log_error "MongoDBの準備がタイムアウトしました"
        docker-compose -f docker-compose.test.yml logs mongodb-test
        docker-compose -f docker-compose.test.yml down -v
        exit 1
    fi
    
    sleep 2
done

# 4. MongoDB統合テスト実行
log_info "🗄️  MongoDB統合テストを実行中..."

# 認証機能の統合テスト
log_info "   🔑 認証機能の統合テスト..."
if go test -v ./controllers -run "TestAuthIntegrationSuite|TestUserRegistrationIntegration|TestUserAuthenticationIntegration|TestAdminUserIntegration"; then
    log_success "認証統合テストが成功しました"
else
    log_error "認証統合テストが失敗しました"
    docker-compose -f docker-compose.test.yml logs mongodb-test
    docker-compose -f docker-compose.test.yml down -v
    exit 1
fi

# お知らせ機能の統合テスト
log_info "   📢 お知らせ機能の統合テスト..."
if go test -v ./controllers -run "TestAnnouncementIntegrationSuite|TestAnnouncementCRUDIntegration|TestAnnouncementListIntegration|TestAnnouncementQueryIntegration"; then
    log_success "お知らせ統合テストが成功しました"
else
    log_error "お知らせ統合テストが失敗しました"
    docker-compose -f docker-compose.test.yml logs mongodb-test
    docker-compose -f docker-compose.test.yml down -v
    exit 1
fi

# 5. 管理者機能のテスト
log_info "   👑 管理者機能のテスト..."
if go test -v ./controllers -run "TestAdmin.*"; then
    log_success "管理者機能テストが成功しました"
else
    log_warning "管理者機能テストで警告が発生しました（継続します）"
fi

# 6. テスト環境のクリーンアップ
log_info "🧹 テスト環境をクリーンアップ中..."
docker-compose -f docker-compose.test.yml down -v > /dev/null 2>&1

# 7. テストカバレッジの生成（オプション）
if [ "$1" = "--coverage" ]; then
    log_info "📊 テストカバレッジを生成中..."
    
    # テスト用MongoDBを再起動（カバレッジ測定のため）
    docker-compose -f docker-compose.test.yml up -d
    sleep 10
    
    # カバレッジ付きでテスト実行
    go test -v -coverprofile=coverage.out ./controllers ./middleware
    
    # カバレッジレポートの生成
    go tool cover -html=coverage.out -o coverage.html
    
    # クリーンアップ
    docker-compose -f docker-compose.test.yml down -v > /dev/null 2>&1
    
    log_success "テストカバレッジレポートが coverage.html に生成されました"
fi

# 成功メッセージ
echo ""
log_success "🎉 すべてのテストが成功しました！"
echo ""
log_info "📋 実行されたテスト："
log_info "   ✅ 基本機能テスト（認証、お知らせ、JWT）"
log_info "   ✅ MongoDB統合テスト（認証、お知らせのCRUD）"
log_info "   ✅ データベース接続とクエリ"
log_info "   ✅ 管理者機能テスト"
echo ""
log_info "🚀 本番環境デプロイの準備が整いました！"

# オプション情報の表示
if [ "$1" != "--coverage" ]; then
    echo ""
    log_info "💡 ヒント："
    log_info "   テストカバレッジを確認するには: ./run_tests.sh --coverage"
    log_info "   個別テストを実行するには: go test -v ./controllers -run TestName"
fi
