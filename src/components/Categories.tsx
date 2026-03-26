import React from 'react';
import { categories } from '../data/products';

interface CategoriesProps {
  onCategorySelect: (category: string) => void;
  selectedCategory: string;
}

const categoryImages: Record<string, string> = {
  'Audio': 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807204733_867ac462.png',
  'Wearables': 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807227458_c603bc3c.jpg',
  'Laptops': 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807248114_2bef8f8a.jpg',
};

const categoryDescriptions: Record<string, string> = {
  'Audio': 'Premium headphones & earbuds',
  'Wearables': 'Smart watches & fitness trackers',
  'Laptops': 'Powerful notebooks & ultrabooks',
};

const Categories: React.FC<CategoriesProps> = ({ onCategorySelect, selectedCategory }) => {
  const displayCategories = categories.filter(c => c !== 'All');

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Shop by Category
          </h2>
          <p className="text-gray-600">Find exactly what you're looking for</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {displayCategories.map((category) => (
            <button
              key={category}
              onClick={() => {
                onCategorySelect(category);
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`group relative overflow-hidden rounded-2xl aspect-[4/3] ${
                selectedCategory === category ? 'ring-4 ring-indigo-500' : ''
              }`}
            >
              <img
                src={categoryImages[category]}
                alt={category}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
                <h3 className="text-xl font-bold text-white mb-1">{category}</h3>
                <p className="text-sm text-gray-200">{categoryDescriptions[category]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
