# コミット前チェックリスト - GitHub Actions テスト通過ガイド

このドキュメントでは、GitHub Actions のテストを確実に通過させるために、コミット前に実行すべきチェック手順を説明します。

## 📋 目次

1. [概要](#概要)
2. [フロントエンドのチェック](#フロントエンドのチェック)
3. [バックエンドのチェック](#バックエンドのチェック)
4. [クイックチェック（推奨）](#クイックチェック推奨)
5. [よくあるエラーと対処法](#よくあるエラーと対処法)

## 概要

GitHub Actions では以下のチェックが自動実行されます：

- **フロントエンド**: ESLint、TypeScript 型チェック、ビルド
- **バックエンド**: Go コードフォーマット、go vet、テスト

これらのチェックをローカルで事前に実行することで、CI/CD パイプラインでの失敗を防ぎます。

## フロントエンドのチェック

### 1. リンターエラー（ESLint）のチェックと修正

**コマンド:**

```bash
cd frontend
npm run lint
```

**エラーが出た場合の対処:**

- 未使用変数エラー: 変数を使用しない場合は削除、または `_` プレフィックスを使用
- インポート順序エラー: 自動フォーマットで修正可能な場合があります

**例: 未使用変数の修正**

```typescript
// ❌ 悪い例
catch (err) {
  setError("エラーが発生しました");
}

// ✅ 良い例（変数を使わない場合）
catch {
  setError("エラーが発生しました");
}
```

### 2. TypeScript 型チェック

**コマンド:**

```bash
cd frontend
npx tsc --noEmit
```

**エラーが出た場合の対処:**

- 型定義エラー: 適切な型を指定
- 未定義の変数: 変数の定義を確認
- インポートエラー: インポートパスを確認

### 3. ビルドテスト

**コマンド:**

```bash
cd frontend
npm run build
```

**エラーが出た場合の対処:**

- ビルドエラー: TypeScript エラーや依存関係の問題を確認
- 依存関係エラー: `npm ci` で依存関係を再インストール

### フロントエンド一括チェック（推奨）

すべてのチェックを順番に実行：

```bash
cd frontend
npm run lint && npx tsc --noEmit && npm run build
```

## バックエンドのチェック

### 1. コードフォーマット（go fmt）

**コマンド:**

```bash
cd backend
go fmt ./...
```

**説明:**

- このコマンドは、フォーマットされていないファイルを自動的に修正します
- 修正されたファイルは変更として表示されるため、コミットに含める必要があります

**フォーマット後の確認:**

```bash
# 変更されたファイルを確認
git status

# 変更内容を確認
git diff
```

### 2. 静的解析（go vet）

**コマンド:**

```bash
cd backend
go vet ./...
```

**エラーが出た場合の対処:**

- 未使用変数、インポート: 削除する
- 型エラー: 型定義を修正
- 論理エラー: コードロジックを確認

### 3. テストの実行（オプション）

本番環境に影響する変更を行った場合は、テストも実行することを推奨します：

**基本テスト:**

```bash
cd backend
go test -v ./controllers ./middleware
```

**統合テスト:**

```bash
cd backend
./run_tests.sh
```

### バックエンド一括チェック（推奨）

フォーマットと静的解析を実行：

```bash
cd backend
go fmt ./... && go vet ./...
```

## クイックチェック（推奨）

コミット前には、以下のコマンドを**プロジェクトルート**から実行することを推奨します：

### 全チェック一括実行スクリプト

以下のコマンドを順番に実行：

```bash
# プロジェクトルートにいることを確認
pwd  # /path/to/Juice_Academy であることを確認

# フロントエンドのチェック
echo "🔍 フロントエンドのチェックを開始..."
cd frontend
npm run lint && npx tsc --noEmit && npm run build
if [ $? -ne 0 ]; then
  echo "❌ フロントエンドのチェックに失敗しました"
  exit 1
fi
echo "✅ フロントエンドのチェック完了"

# バックエンドのチェック
echo "🔍 バックエンドのチェックを開始..."
cd ../backend
go fmt ./... && go vet ./...
if [ $? -ne 0 ]; then
  echo "❌ バックエンドのチェックに失敗しました"
  exit 1
fi
echo "✅ バックエンドのチェック完了"

echo "🎉 すべてのチェックが完了しました！"
```

### シェルスクリプト化（オプション）

上記のコマンドを `pre-commit-check.sh` として保存すると便利です：

```bash
#!/bin/bash
set -e

echo "🚀 コミット前チェックを開始..."

# フロントエンド
cd frontend
echo "📦 フロントエンド: ESLint..."
npm run lint
echo "📦 フロントエンド: TypeScript型チェック..."
npx tsc --noEmit
echo "📦 フロントエンド: ビルド..."
npm run build
cd ..

# バックエンド
cd backend
echo "🔧 バックエンド: コードフォーマット..."
go fmt ./...
echo "🔧 バックエンド: 静的解析..."
go vet ./...
cd ..

echo "✅ すべてのチェックが完了しました！"
```

実行権限を付与して実行：

```bash
chmod +x pre-commit-check.sh
./pre-commit-check.sh
```

## よくあるエラーと対処法

### フロントエンド

#### 1. ESLint エラー: 未使用変数

**エラーメッセージ:**

```
'err' is defined but never used
```

**対処法:**

```typescript
// 変数を使わない場合
catch {
  // エラーハンドリング
}

// 変数を使う場合
catch (err) {
  console.error(err);
  // エラーハンドリング
}
```

#### 2. TypeScript 型エラー

**エラーメッセージ:**

```
Property 'xxx' does not exist on type 'yyy'
```

**対処法:**

- 型定義を確認
- 適切な型アサーションを使用
- インターフェースや型を定義

#### 3. ビルドエラー

**エラーメッセージ:**

```
Module not found: Can't resolve 'xxx'
```

**対処法:**

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### バックエンド

#### 1. go fmt で変更されたファイルがある

**状況:**
`go fmt ./...` を実行すると、フォーマットが修正されたファイル名が表示される

**対処法:**

```bash
# 変更を確認
git diff

# 変更をコミットに含める
git add backend/...
```

#### 2. go vet エラー

**エラーメッセージ:**

```
xxx declared and not used
```

**対処法:**

- 未使用の変数やインポートを削除
- 使用する場合は、変数名を確認

## チェックリスト

コミット前に以下のチェックリストを確認してください：

### フロントエンド

- [ ] `cd frontend && npm run lint` がエラーなく完了
- [ ] `cd frontend && npx tsc --noEmit` がエラーなく完了
- [ ] `cd frontend && npm run build` が成功
- [ ] 未使用変数がない
- [ ] 型エラーがない

### バックエンド

- [ ] `cd backend && go fmt ./...` を実行し、必要に応じて変更をコミット
- [ ] `cd backend && go vet ./...` がエラーなく完了
- [ ] （必要な場合）`cd backend && go test ./...` が成功

### 全体

- [ ] 変更を `git status` で確認
- [ ] 意図しない変更がないことを確認
- [ ] 変更をコミットしてプッシュ

## GitHub Actions で実行されるチェック

### フロントエンドワークフロー（`.github/workflows/frontend-tests.yml`）

1. **ESLint 静的解析** (`npm run lint`)
2. **TypeScript 型チェック** (`npx tsc --noEmit`)
3. **本番環境ビルド** (`npm run build`)

### バックエンドワークフロー（`.github/workflows/backend-tests.yml`）

1. **Go コードフォーマット** (自動実行)
2. **go vet 静的解析** (自動実行)
3. **基本テスト** (`go test`)
4. **MongoDB 統合テスト** (`go test`)

### 本番デプロイワークフロー（`.github/workflows/deploy-production.yml`）

1. **フロントエンドテスト** (`npm run lint`, `npx tsc --noEmit`)
2. **バックエンドテスト** (`go test`)

## トラブルシューティング

### チェックが時間がかかる場合

- フロントエンド: `node_modules` を削除して再インストール
- バックエンド: Go モジュールキャッシュをクリア

```bash
# フロントエンド
cd frontend
rm -rf node_modules
npm install

# バックエンド
cd backend
go clean -modcache
go mod download
```

### CI/CD で失敗するがローカルで成功する場合

- 環境変数の違いを確認
- Node.js/Go のバージョンが一致しているか確認
- 依存関係が最新か確認

## 参考

- [README-TESTING.md](./README-TESTING.md) - 詳細なテスト実行方法
- [README.md](./README.md) - プロジェクト全体の説明

---

**最後に:** このチェックリストを実行することで、GitHub Actions でのテスト失敗を大幅に減らすことができます。特に重要な変更を行う前に、必ずすべてのチェックを実行してください。
