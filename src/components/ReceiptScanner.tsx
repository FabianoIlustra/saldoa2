import React from 'react';

const ReceiptScanner: React.FC<any> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl">
        <h2>Receipt Scanner</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ReceiptScanner;
