# Juice Academy Frontend

このプロジェクトは、React + TypeScript + Vite + Tailwind CSSを使用して構築されたフロントエンドアプリケーションです。

## 技術スタック

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router

## 開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm 9以上

### インストール

```bash
# 依存関係のインストール
npm install
```

### 開発サーバーの起動

```bash
# 開発サーバーを起動
npm run dev
```

開発サーバーは http://localhost:3000 で実行されます。

### ビルド

```bash
# 本番用ビルド
npm run build
```

ビルドされたファイルは `dist` ディレクトリに出力されます。

## Dockerでの実行

Dockerを使用して開発環境を起動することもできます。

```bash
# Dockerイメージのビルド
docker build -t juice-academy-frontend .

# Dockerコンテナの起動
docker run -p 3000:3000 juice-academy-frontend
```

## プロジェクト構成

```
frontend/
├── public/          # 静的ファイル
├── src/             # ソースコード
│   ├── components/  # 共通コンポーネント
│   ├── pages/       # ページコンポーネント
│   ├── App.tsx      # アプリケーションのルートコンポーネント
│   └── main.tsx     # エントリーポイント
├── index.html       # HTMLテンプレート
└── vite.config.ts   # Viteの設定ファイル
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
