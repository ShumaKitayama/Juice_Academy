import React from 'react';

const About: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">アバウトページ</h1>
      <p className="mb-4">このアプリケーションについての情報です。</p>
      <div className="bg-green-100 p-4 rounded-lg">
        <p>React Router を使用したルーティングの例です。</p>
      </div>
    </div>
  );
};

export default About; 