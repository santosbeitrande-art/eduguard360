import React from 'react';
import { heroImage, stats } from '../data/content';
import { ArrowRightIcon, TruckIcon, ShieldIcon, RefreshIcon, CreditCardIcon } from './ui/Icons';

const Hero: React.FC = () => {
  const scrollToProducts = () => {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = [
    { icon: TruckIcon, title: 'Free Shipping', desc: 'On orders over $100' },
    { icon: ShieldIcon, title: 'Secure Payment', desc: '100% protected' },
    { icon: RefreshIcon, title: 'Easy Returns', desc: '30-day policy' },
    { icon: CreditCardIcon, title: 'Flexible Payment', desc: 'Multiple options' },
  ];

  return (
    <section id="home" className="relative pt-20 lg:pt-24 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
      
      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000" />
      <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              New Collection 2026
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Discover the
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Future of Tech
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
              Experience premium technology products designed for modern life. 
              From cutting-edge audio to powerful laptops, find everything you need.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={scrollToProducts}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/30"
              >
                Shop Now
                <ArrowRightIcon size={20} />
              </button>
              <button
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-full font-semibold border-2 border-gray-200 hover:border-indigo-600 hover:text-indigo-600 transition-all"
              >
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-gray-200">
              {stats.map((stat, index) => (
                <div key={index} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src={heroImage}
                alt="Tech Products"
                className="w-full rounded-3xl shadow-2xl"
              />
              
              {/* Floating Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Premium Quality</div>
                    <div className="text-sm text-gray-500">Certified Products</div>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img src="https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807289427_407eac36.jpg" alt="User" className="w-8 h-8 rounded-full border-2 border-white" />
                    <img src="https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807300210_8b0ef8fc.png" alt="User" className="w-8 h-8 rounded-full border-2 border-white" />
                    <img src="https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807293956_afc5c391.png" alt="User" className="w-8 h-8 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">50K+</div>
                    <div className="text-sm text-gray-500">Happy Customers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl transform rotate-3 scale-105 opacity-10" />
          </div>
        </div>

        {/* Features Bar */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <feature.icon className="text-indigo-600" size={24} />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{feature.title}</div>
                <div className="text-sm text-gray-500">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
