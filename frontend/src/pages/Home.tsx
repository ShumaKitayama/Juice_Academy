import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">ホームページ</h1>
      <p className="mb-4">これはReact + TypeScript + Tailwind CSSで構築されたアプリケーションです。</p>
      <div className="bg-blue-100 p-4 rounded-lg">
        <p>新しい環境が正常に構築されました！</p>
      </div>
    </div>
  );
};

export default Home; 