import React, { useState, useEffect } from 'react';
import { CloseIcon } from './ui/Icons';

const PromoBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentPromo, setCurrentPromo] = useState(0);

  const promos = [
    'Free shipping on orders over $100',
    'New Year Sale: Up to 30% off select items',
    'Join our newsletter for exclusive deals'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <p className="text-sm font-medium text-center animate-fade-in">
          {promos[currentPromo]}
        </p>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close promo bar"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default PromoBar;
