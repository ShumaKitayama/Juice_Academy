#!/bin/bash

# Juice Academy 本番環境デプロイスクリプト
# 使用方法: ./deploy.sh [--build-only] [--no-backup]

set -e  # エラー時に停止

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

# オプション解析
BUILD_ONLY=false
NO_BACKUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        -h|--help)
            echo "使用方法: $0 [--build-only] [--no-backup]"
            echo "  --build-only  ビルドのみ実行（デプロイはしない）"
            echo "  --no-backup   データベースバックアップをスキップ"
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            exit 1
            ;;
    esac
done

log_info "🚀 Juice Academy 本番環境デプロイを開始します..."

# 環境変数ファイルの確認
if [ ! -f ".env.production" ]; then
    log_error ".env.production ファイルが見つかりません"
    log_info "📝 .env.example をコピーして .env.production を作成してください"
    log_info "cp .env.example .env.production"
    log_info "その後、適切な本番環境の値を設定してください"
    exit 1
fi

# 必要なツールのインストール確認
log_info "🔧 必要なツールの確認..."

if ! command -v docker &> /dev/null; then
    log_error "Docker がインストールされていません"
    log_info "https://docs.docker.com/get-docker/ からインストールしてください"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose がインストールされていません"
    log_info "https://docs.docker.com/compose/install/ からインストールしてください"
    exit 1
fi

log_success "必要なツールが揃っています"

# 現在のGitブランチとコミットハッシュを取得
CURRENT_BRANCH=$(git branch --show-current)
COMMIT_HASH=$(git rev-parse --short HEAD)
DEPLOY_TIME=$(date '+%Y%m%d_%H%M%S')

log_info "📋 デプロイ情報:"
log_info "   ブランチ: $CURRENT_BRANCH"
log_info "   コミット: $COMMIT_HASH"
log_info "   時刻: $DEPLOY_TIME"

# データベースバックアップ（本番環境でのみ、かつ--no-backupが指定されていない場合）
if [ "$NO_BACKUP" = false ]; then
    log_info "💾 データベースバックアップを作成します..."
    
    # バックアップディレクトリを作成
    mkdir -p mongodb-backup/$DEPLOY_TIME
    
    # MongoDB コンテナが動いている場合のみバックアップを実行
    if docker-compose -f docker-compose.prod.yml ps mongodb | grep -q "Up"; then
        docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump \
            --out /backup/$DEPLOY_TIME \
            --gzip || log_warning "バックアップに失敗しましたが、デプロイを続行します"
        log_success "データベースバックアップ完了: mongodb-backup/$DEPLOY_TIME"
    else
        log_warning "MongoDBコンテナが起動していないため、バックアップをスキップします"
    fi
fi

# 既存のコンテナを停止・削除
log_info "🛑 既存のコンテナを停止します..."
docker-compose -f docker-compose.prod.yml down || log_warning "既存のコンテナが見つかりませんでした"

# 古いイメージを削除（ディスク容量節約）
log_info "🧹 古いDockerイメージを削除します..."
docker system prune -f || log_warning "イメージの削除に失敗しました"

# イメージのビルド
log_info "🔨 Docker イメージをビルドします..."
log_info "   これには数分かかる場合があります..."

# バックエンドのビルド
log_info "   📦 バックエンドをビルド中..."
docker-compose -f docker-compose.prod.yml build --no-cache backend

# フロントエンドのビルド
log_info "   📦 フロントエンドをビルド中..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend

log_success "Docker イメージのビルドが完了しました"

# ビルドのみの場合はここで終了
if [ "$BUILD_ONLY" = true ]; then
    log_success "🎯 ビルドのみが完了しました"
    exit 0
fi

# データベースの初期化スクリプト確認
log_info "📁 MongoDB初期化スクリプトを確認します..."
if [ ! -f "mongo-init/init.js" ]; then
    log_warning "mongo-init/init.js が見つかりません"
fi

# SSL証明書の確認
log_info "🔐 SSL証明書を確認します..."
if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
    log_warning "SSL証明書が見つかりません (ssl/cert.pem, ssl/key.pem)"
    log_info "自己署名証明書を生成するか、Let's Encryptを使用してください"
    log_info "自己署名証明書の生成例:"
    log_info "  mkdir -p ssl"
    log_info "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
    log_info "    -keyout ssl/key.pem -out ssl/cert.pem \\"
    log_info "    -subj '/C=JP/ST=Tokyo/L=Tokyo/O=JuiceAcademy/CN=localhost'"
fi

# ログディレクトリの作成
log_info "📝 ログディレクトリを作成します..."
mkdir -p logs nginx/logs

# 本番環境でのコンテナ起動
log_info "🚀 本番環境でコンテナを起動します..."
docker-compose -f docker-compose.prod.yml up -d

# 起動待機
log_info "⏳ サービスの起動を待機しています..."
sleep 30

# ヘルスチェック
log_info "🏥 サービスのヘルスチェックを実行します..."

# バックエンドのヘルスチェック
log_info "   🔍 バックエンドをチェック中..."
for i in {1..5}; do
    if curl -f http://localhost:8080/api/announcements > /dev/null 2>&1; then
        log_success "バックエンド起動成功"
        break
    else
        if [ $i -eq 5 ]; then
            log_error "バックエンドの起動に失敗しました"
            log_info "ログを確認してください:"
            log_info "docker-compose -f docker-compose.prod.yml logs backend"
            exit 1
        fi
        log_info "   再試行中... ($i/5)"
        sleep 10
    fi
done

# フロントエンドのヘルスチェック
log_info "   🔍 フロントエンドをチェック中..."
for i in {1..5}; do
    if curl -f http://localhost > /dev/null 2>&1; then
        log_success "フロントエンド起動成功"
        break
    else
        if [ $i -eq 5 ]; then
            log_error "フロントエンドの起動に失敗しました"
            log_info "ログを確認してください:"
            log_info "docker-compose -f docker-compose.prod.yml logs frontend"
            exit 1
        fi
        log_info "   再試行中... ($i/5)"
        sleep 10
    fi
done

# MongoDBのヘルスチェック
log_info "   🔍 データベースをチェック中..."
if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    log_success "データベース接続成功"
else
    log_warning "データベースの接続確認に失敗しました"
    log_info "ログを確認してください:"
    log_info "docker-compose -f docker-compose.prod.yml logs mongodb"
fi

# デプロイ完了
log_success "🎉 デプロイ完了！"
echo ""
log_info "📋 デプロイ情報:"
log_info "   ブランチ: $CURRENT_BRANCH"
log_info "   コミット: $COMMIT_HASH"
log_info "   デプロイ時刻: $DEPLOY_TIME"
echo ""
log_info "🌐 アクセス情報:"
log_info "   フロントエンド: http://localhost (HTTPS: https://localhost)"
log_info "   バックエンドAPI: http://localhost:8080/api"
echo ""
log_info "📊 運用コマンド:"
log_info "   ログ確認: docker-compose -f docker-compose.prod.yml logs -f"
log_info "   状態確認: docker-compose -f docker-compose.prod.yml ps"
log_info "   停止: docker-compose -f docker-compose.prod.yml down"
log_info "   再起動: docker-compose -f docker-compose.prod.yml restart"
echo ""
log_info "💾 バックアップ場所: mongodb-backup/$DEPLOY_TIME"
echo ""
log_success "デプロイが正常に完了しました！"
