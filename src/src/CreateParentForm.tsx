import React, { useState } from 'react';
import { testimonials } from '../data/content';
import { StarIcon, ChevronDownIcon, ChevronUpIcon } from './ui/Icons';

const Testimonials: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        size={18}
        filled={i < rating}
        className={i < rating ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied customers.
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto">
          {/* Main Testimonial */}
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl mb-8">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <img
                src={testimonials[activeIndex].image}
                alt={testimonials[activeIndex].name}
                className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl object-cover"
              />
              <div className="flex-1 text-center lg:text-left">
                <div className="flex justify-center lg:justify-start gap-1 mb-4">
                  {renderStars(testimonials[activeIndex].rating)}
                </div>
                <p className="text-xl lg:text-2xl text-gray-700 italic mb-6">
                  "{testimonials[activeIndex].content}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonials[activeIndex].name}
                  </div>
                  <div className="text-indigo-600">
                    {testimonials[activeIndex].role}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setActiveIndex(prev => (prev === 0 ? testimonials.length - 1 : prev - 1))}
              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 transition-all"
            >
              <ChevronUpIcon size={24} className="rotate-[-90deg]" />
            </button>
            
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setActiveIndex(prev => (prev === testimonials.length - 1 ? 0 : prev + 1))}
              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 transition-all"
            >
              <ChevronDownIcon size={24} className="rotate-[-90deg]" />
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 lg:gap-16">
          {['Trusted by 50K+ Customers', '4.9/5 Average Rating', '100+ Countries Served'].map((badge, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-white">{badge.split(' ')[0]}</div>
              <div className="text-indigo-200">{badge.split(' ').slice(1).join(' ')}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
