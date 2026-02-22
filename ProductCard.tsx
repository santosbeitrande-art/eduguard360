import React, { useState } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { HeartIcon, StarIcon, ShoppingCartIcon, CheckIcon } from './ui/Icons';

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails }) => {
  const { addToCart } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        size={14}
        filled={i < Math.floor(rating)}
        className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div
      onClick={() => onViewDetails?.(product)}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all duration-300 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.featured && (
            <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
              Featured
            </span>
          )}
          {product.stock < 20 && (
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
              Low Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isWishlisted
              ? 'bg-red-500 text-white'
              : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-red-500'
          }`}
        >
          <HeartIcon size={20} filled={isWishlisted} />
        </button>

        {/* Quick Add Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleAddToCart}
            disabled={isAdded}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              isAdded
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-900 hover:bg-indigo-600 hover:text-white'
            }`}
          >
            {isAdded ? (
              <>
                <CheckIcon size={20} />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingCartIcon size={20} />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
          {product.category}
        </div>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">
            {renderStars(product.rating)}
          </div>
          <span className="text-sm text-gray-500">
            ({product.reviews_count})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </div>
          <button
            onClick={handleAddToCart}
            className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors lg:hidden"
          >
            <ShoppingCartIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
