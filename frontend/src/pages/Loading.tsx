import React from 'react';

const Loading: React.FC = () => {
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      backgroundColor: '#f1f1f1',
      zIndex: 1000
    },
    water: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: 0,
      backgroundColor: '#ff8a4c',
      animation: 'waterRise 1.3s forwards'
    }
  };

  // アニメーションはグローバルCSSで定義する必要があります
  return (
    <>
      <div style={styles.container}>
        <div style={styles.water}></div>
      </div>
      <style>
        {`
          @keyframes waterRise {
            0% { height: 0; }
            100% { height: 100%; }
          }
        `}
      </style>
    </>
  );
};

export default Loading;