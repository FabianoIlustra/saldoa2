import React from 'react';

const LandingPage: React.FC<any> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-600 text-white">
      <h1 className="text-4xl font-bold mb-4">Saldo A2</h1>
      <button onClick={onStart} className="bg-white text-indigo-600 px-6 py-3 rounded-full font-bold">
        Começar
      </button>
    </div>
  );
};

export default LandingPage;
