import React, { useState } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { CloseIcon, HeartIcon, StarIcon, MinusIcon, PlusIcon, ShoppingCartIcon, TruckIcon, ShieldIcon, RefreshIcon } from './ui/Icons';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  if (!product) return null;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    onClose();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        size={20}
        filled={i < Math.floor(rating)}
        className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <CloseIcon size={24} />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square bg-gray-100">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.featured && (
              <span className="absolute top-4 left-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full">
                Featured
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-6 lg:p-8">
            <div className="text-sm font-medium text-indigo-600 uppercase tracking-wide mb-2">
              {product.category}
            </div>
            
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              {product.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {renderStars(product.rating)}
              </div>
              <span className="text-gray-600">
                {product.rating} ({product.reviews_count} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-gray-900 mb-6">
              ${product.price.toFixed(2)}
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              {product.description}
            </p>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-3 h-3 rounded-full ${product.stock > 20 ? 'bg-green-500' : 'bg-orange-500'}`} />
              <span className="text-sm text-gray-600">
                {product.stock > 20 ? 'In Stock' : `Only ${product.stock} left`}
              </span>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                >
                  <MinusIcon size={18} />
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                >
                  <PlusIcon size={18} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02]"
              >
                <ShoppingCartIcon size={20} />
                Add to Cart
              </button>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                  isWishlisted
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                <HeartIcon size={24} filled={isWishlisted} />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
              <div className="text-center">
                <TruckIcon className="mx-auto text-indigo-600 mb-2" size={24} />
                <div className="text-xs text-gray-600">Free Shipping</div>
              </div>
              <div className="text-center">
                <ShieldIcon className="mx-auto text-indigo-600 mb-2" size={24} />
                <div className="text-xs text-gray-600">1 Year Warranty</div>
              </div>
              <div className="text-center">
                <RefreshIcon className="mx-auto text-indigo-600 mb-2" size={24} />
                <div className="text-xs text-gray-600">30-Day Returns</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
